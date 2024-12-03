const {Order, OrderSchedule, SmorodinaModel} = require('../models');
const ttkpg = require('../libs/ttkpg');
const { badRequest, notFound, serverUnavailable, conflict } = require('boom');
const { requiredFields } = require('../libs/checkValidation');
const needle = require('needle');
const config = require('../config');
const Smorodina = require('../libs/Smorodina');
const Region = require('../models/Region');
const Consumer = require('../models/Consumer');
const {getSsdUriByConsumer} = require('../libs/getSsdUriByConsumer');
const qPromConsumerInfo = require('../requests/qPromConsumerInfo');

module.exports = class OrderController {
    static async createOrder(subLogin, 
        {amount, addParams, approveUrl, cancelUrl, declineUrl, description, email, paymentType, contr_UID, orderType, tax, tax_sum, orderTypeNumber, contr_num, regionId}
    ) {
        const cons_UID = subLogin.cons_UID;
        const {consumer} = subLogin;

        const region = await Region.findOne({_id: regionId})

        const uri = getSsdUriByConsumer(consumer);
        if (!uri) {
            throw conflict(`Incorrent ssdUri in ${consumer.cons_UID} consumer and ${order.email} email`);
        }
        const consInfo = await qPromConsumerInfo(consumer.cons_UID, uri);
        const smorodina = new Smorodina({
            amount, 
            addParams, 
            approveUrl, 
            cancelUrl, 
            declineUrl, 
            description, 
            email, 
            paymentType, 
            contr_UID, 
            orderType, 
            tax, 
            tax_sum, 
            orderTypeNumber,
            cons_inn: consumer.cons_inn, 
            cons_kpp: consumer.cons_kpp,
            contr_num,
            cons_UID,
            Sum_type: paymentType === 'credit' ? 1 : 2,
            typePaymentCode: region.pay.typePaymentCode,
            lspu: region.pay.lspu,
            idpu: region.pay.idpu,
            pointCode: region.pay.pointCode,
            abonentId: region.pay.abonentId,
            service: region.pay.service,
            cons_name: consInfo.cons_short_name
        }, region.pay.gateUrl);
        const {UID} = await smorodina.reqCreateInvoice();
        if (!UID) {
            throw serverUnavailable('Smorodina error');
        }

        const currency = 643;
        const order = await Order({
            merchant: region.pay.merchant,
            amount,
            description,
            currency,
            addParams,
            user: subLogin.user._id,
            subLogin: subLogin._id,
            email,
            contr_UID,
            cons_UID,
            paymentType,
            orderTypeNumber,
            smorodina_UID: UID,
            tax_sum,
            tax,
            regionId
        }).save();
        const body = {
            OrderType: 'Purchase',
            Merchant: region.pay.merchant,
            Amount: amount,
            Currency: currency,
            Description: description,
            ApproveURL: approveUrl,
            CancelURL: cancelUrl,
            DeclineURL: declineUrl,
        };
        const {orderId, sessionId, url, status, error} = await ttkpg.CreateOrder(body);
        await Order.updateOne({_id: order._id}, {$set: {orderId, sessionId, url, status}});
        if (error) throw badRequest(error);
        return {
            data: {
                _id: order._id,
                orderId,
                sessionId,
                url,
            },
        };
    }

    static async getOrdersOfUser(subLogin) {
        const orders = await Order.find({user: subLogin.user._id, cons_UID: subLogin.cons_UID}).lean();
        // console.log('subLogin', subLogin);

        const orderStatusesPromises = orders.map(o => ttkpg.GetOrderStatus({
            Merchant: o.merchant,
            OrderID: o.orderId,
            SessionID: o.sessionId,
        }).then(({status}) => {
            o.status = status;
            return o;
        }));
        await Promise.all(orderStatusesPromises);
        return {
            data: orders,
        };
    }

    static async getOrderStatus(subLogin, {_id}) {
        const query = {_id};
        if (subLogin) query.user = subLogin.user._id;
        const {sessionId, merchant, orderId} = await Order.findOne(query).lean();
        if (!sessionId) throw notFound('Order not found');
        const {status} = await ttkpg.GetOrderStatus({
            Merchant: merchant,
            OrderID: orderId,
            SessionID: sessionId,
        });

        await Order.updateOne({
            orderId}, {$set: {status}});

        return {
            data: {
                status: status || null,
            },
        };
    }

    static async getInfoAboutOrder(subLogin, {_id}) {
        const query = {_id};
        if (subLogin) query.user = subLogin.user._id;
        const order = await Order.findOne(query).lean();
        if (!order) throw notFound('Order not found');
        const result = await ttkpg.GetOrderInformation({
            Merchant: order.merchant,
            OrderID: order.orderId,
            SessionID: order.sessionId,
        });
        const {data: {status}} = await OrderController.getOrderStatus(subLogin, {_id});
        const smorodinaData = await SmorodinaModel.find({UID: order.smorodina_UID});
        
        return {
            data: {
                order,
                orderInformation: result,
                status,
                smorodinaData: smorodinaData[0]
            },
        };
    }

    static async createOrderSchedule(subLogin, {amount, addParams, description, startDate, repeatPeriodHours, approveUrl, cancelUrl, declineUrl, email, contr_UID}) {
        requiredFields(['amount', 'description', 'approveUrl', 'cancelUrl', 'declineUrl'], {amount, description, approveUrl, cancelUrl, declineUrl});
        const currency = 'RUB';
        const region = await Region.findOne({_id: subLogin.user.regionId})
        await OrderSchedule({
            merchant: region.pay.merchant,
            amount,
            description,
            currency,
            addParams,
            user: subLogin.user._id,
            subLogin: subLogin._id,
            repeatPeriodHours,
            startDate,
            approveUrl,
            cancelUrl,
            declineUrl,
            email,
            contr_UID,
        }).save();

        return {message: 'ok'};
    }

    static async getOrderSchedules(subLogin) {
        const orderSchedules = await OrderSchedule.find({user: subLogin.user._id}).lean();
        return {
            data: orderSchedules,
        };
    }

    static async getOrderScheduleById(subLogin, _id) {
        const orderSchedule = await OrderSchedule.findOne({user: subLogin.user._id, _id});
        if (!orderSchedule) throw notFound('Schedule not found');
        return {
            data: orderSchedule,
        };
    }

    static async updateOrderScheduleById(subLogin, _id, {inn, kpp, amount, paymentPerson, addParams, approveUrl, cancelUrl, declineUrl}) {
        await OrderController.getOrderScheduleById(subLogin, _id);
        await OrderSchedule.updateOne({_id}, {$set: {inn, kpp, amount, paymentPerson, addParams, approveUrl, cancelUrl, declineUrl}});
        return {
            data: null,
        };
    }

    static async deleteOrderSchedule(subLogin, _id) {
        await OrderSchedule.deleteOne({user: subLogin.user._id, _id});
        return {
            data: null,
        };
    }

    static async getSendedOrder(order) {
        if (!order || !order.document || !order.document.result || !order.document.result.operation || !order.document.result.operation.operation_id) {
            console.error('UNDEFINED IN ORDER SENDED', JSON.stringify(order));
        }

        const region = await Region.findOne({ _id: order.regionId });
        const options = {
            headers: {
                'content-type': 'application/json',
                accept: 'application/json',
                'API-KEY': region.pay.apiKey,
                // 'API-KEY': config.payment.apiKey,
            }
        };
        
        const {body} = await needle('get', `${region.pay.documentCreateUri}/${order.document.result.operation.operation_id}`, options);
        const resultBody = JSON.parse(body);
        await Order.updateOne({_id: order._id}, {$set: {'document.result': resultBody}});
        return;
    }

    static async sendOrder(subLogin, _id, order) {
        if (!order) {
            const {data} = await OrderController.getInfoAboutOrder(subLogin, {_id});
            if (!data.order) throw notFound(`Order ${_id} not found`);
            order = data.order;
        }
        if (order.orderTypeNumber != 1 && order.orderTypeNumber != 5) {
            return;
        }

        const region = await Region.findOne({ _id: order.regionId });
        const options = {
            headers: {
                'content-type': 'application/json',
                accept: 'application/json',
                'API-KEY': region.pay.apiKey,
            }
        };
        order.amount = order.amount / 100;
        const timestamp = Date.now();

        const consumer = await Consumer.findOne({ cons_UID: order.cons_UID });
        const smorodina = await SmorodinaModel.findOne({
          UID: order.smorodina_UID,
        });
        const data = {
          doc_type: "sale",
          timestamp_utc: timestamp,
          timestamp_local: timestamp,

          "API-KEY": region.pay.apiKey,
          tax_system: "OSN",

          email: order.email,
          inn: region.pay.inn,
          //   inn: "6234117358",

          payment_address: '117535, Варшавское шоссе, 133',
          payment_place: 'https://xn--j1abb9e.xn--80ahmohdapg.xn--80asehdb/',
          tag_1085: "Номер договора",
          tag_1086: smorodina.Requests.InfoPay.Contr_num,
          
          customer_info: consumer.cons_full_name,
          customer_inn: consumer.cons_inn,
          items: [
            {
              name: order.orderTypeNumber == 1 ? 'Реализация газа' : 'Услуга по ограничению поставки газа',
              price: order.amount,
              quantity: 1,
              sum: order.amount,
              tax: order.paymentType === "credit" ? "none" : "vat120",
              tax_sum: order.tax_sum,
              sign_method_calculation:
                order.paymentType === "credit"
                  ? "credit_payment"
                  : "prepayment",
              sign_calculation_object:
                order.paymentType === "credit" ? "payment" : "payment",
            },
          ],
        };
    
        if (order.paymentType === "credit") {
          data.credit_payment = 0;
          data.total = order.amount;
          data.cash = 0;
          data.advance_payment = 0;
          data.barter = 0;
        } else {
          data.advance_payment = 0;
          data.total = order.amount;
          data.cash = 0;
          data.credit_payment = 0;
          data.barter = 0;
        }
        console.log('SENDING ORDER', JSON.stringify({uri: region.pay.documentCreateUri, options, data, order}));
        const {body} = await needle('post', region.pay.documentCreateUri, data, options);
        console.log('RESULT', JSON.stringify(body));
        try {
            const resultBody = JSON.parse(body);
            await Order.updateOne({_id: order._id}, {$set: {operationId: resultBody.operation.operation_id, document: {create: data, result: resultBody}}});
        } catch (err) {
            console.error(err);
        }

        return body;
    }

};
