const schedule = require('node-schedule');
const { qGetDocInform } = require('./controllers/DocumentController');
const {getInfoAboutOrder, sendOrder, getSendedOrder} = require('./controllers/Order');
// const { getSsdUriByCons_UID } = require('./libs/getSsdUriByConsumer');
// const sendEmail = require('./libs/sendEmail');
require('./db')();
const moment = require('moment');
const {Consumer, SsdUri, Order} = require('./models');
const SubLogin = require('./models/SubLogin');
const qPromConsumerInfo = require('./requests/qPromConsumerInfo');
const Smorodina = require('./libs/Smorodina');
// const NOT_EMAIL_NOTIFICATION_TYPE = ['Уведомление: Новый документ', 'Уведомление: Документ изменен', 'Новый документ', 'Документ изменен'];
const ttkpg = require('./libs/ttkpg');
const Region = require('./models/Region');
const sendEmail = require('./libs/sendEmail');
const {getSsdUriByConsumer} = require('./libs/getSsdUriByConsumer');
// const sendCreatingOrder = async () => {
//     try {
//         const orderSchedules = await OrderSchedule.find().lean();
//         for (const schedule of orderSchedules) {

//         }
//     } catch (err) {
//         console.error(err);
//     }
// };

const checkConsumersSsd = async () => {
    const [consumers, ssdUris] = await Promise.all([
        Consumer.find({}, {cons_UID: 1}),
        SsdUri.find({}, {uri: 1})
    ]);
    
    loop: for (const consumer of consumers) {
        loop2: for (const ssd of ssdUris) {
            try {
                const result = await qPromConsumerInfo(consumer.cons_UID, ssd.uri);
                if (result.cons_UID) {
                    await Consumer.updateMany({cons_UID: consumer.cons_UID}, {$set: {ssdUri: ssd._id}});
                    continue loop;
                }
            } catch (err) {
                console.error(err);
                continue loop2;
            }
        }
    }
};

// const consumerMailText = (event, text, cons_full_name, cons_inn, cons_kpp) => {
//     let result = `Потребитель: ${cons_full_name}\n`;
//     result += `ИНН/КПП: ${cons_inn}/${cons_kpp}\n`;
//     result += `Уведомление: ${event || text}`;
//     return result;
// };

const getDocInfo = async () => {
    console.log('GET DOC INFO');
    await qGetDocInform();
};

// const sendDocsOnEmail = async () => {
//     console.log(process.pid, 'ENTER IN SCRIPT');
//     while (true) {
//         try {
//             const consumerNotifications = await ConsumerNotification.find({sended: false}).lean();
//             console.log('START SCRIPT', process.pid, consumerNotifications.length);
//             for (const cn of consumerNotifications) {
//                 console.log('CN', JSON.stringify({_id: cn._id, type: cn.type, text: cn.text, allConsumers: cn.allConsumers, createdAt: cn.createdAt, updatedAt: cn.updatedAt}));
//                 cn.users = cn.users.map(String);
//                 let counter = 0;
//                 for (const cons_UID of cn.cons_UIDs) {
//                     try {
//                         counter++;
//                         console.log(counter, cons_UID);

//                     } catch (err) {
//                         console.log('LOOP ERROR', err);
//                     }
                    
//                 }
//                 console.log('Update consumer notification');
//                 const r = await ConsumerNotification.updateOne({_id: cn._id}, {$set: {sended: true}});
//                 console.log(r);
//             }
//         } catch (err) {
//             console.log('ERROR', err);
//         }
//         await new Promise((resolve, _reject) => {
//             setTimeout(async () => {
//                 resolve();
//             }, 1000 * 120);
//         });
//     }
// };

// const sendingOrderSchedule = async () => {
//     try {
//         const orders = await Order.find({createdAt: {$gte: moment().add(-1, 'hours')}}).lean();
//         console.log('sendingOrderSchedule', orders.length);
//         for (const order of orders) {
//             try {
//                 const {data: {status}} = await getInfoAboutOrder(null, {_id: order._id}, order);
//                 if (status === 'APPROVED') {
//                     const sendedOrder = await SendedOrder.findOne({orderId: order._id});
//                     if (!sendedOrder) {
//                         const result = await sendOrder(null, null, order);
//                         console.log('sendingOrderSchedule', JSON.stringify(result));
//                         await SendedOrder({orderId: order._id}).save();
//                     }
//                 }
//             } catch (err) {
//                 console.error('sendingOrderSchedule LOOP', err);
//             }
//         }
//     } catch (err) {
//         console.error('sendingOrderSchedule', err);
//     }
// };

// sendDocsOnEmail();
function getOrderNotificationText(payDate, cons_short_name, inn, kpp, description, money, approval, sessionId, orderId, Brand, Pan, regionName, feeCalculationResult) {
    const formatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `
Уважаемый(ая) пользователь ЛКЮЛ!

Это сообщение подтверждает произведенный Вами платеж по банковской карте в Личном кабинете юридического лица.

Данное сообщение сформировано автоматически и не требует Вашего ответа.

По вопросам, связанным с Вашим платежом, Вы можете обратиться в банк, выдавший Вашу карту.

Данные платежа:
Получатель: Газпром межрегионгаз ${regionName}

Статус оплаты: Успешно
Дата оплаты: ${payDate}

Потребитель: ${cons_short_name}
ИНН КПП: ${inn}/${kpp}
Услуга: ${description}
Сумма платежа: ${ formatter.format(money / 100) } руб.
Сумма комиссии: ${ formatter.format(feeCalculationResult / 100) } руб.

Банковская карта: ${Brand} ${Pan}
Код подтверждения: ${approval}
ID транзакции: ${sessionId}
ID платежа: ${orderId}


Сервис оплаты предоставляется АО «АБ «РОССИЯ»
Тел.: 8 (4722)356103 e-mail: crkp@abr.ru
Благодарим Вас за пользование нашими услугами!
    `
}

const updateSendedOrderStatus = async () => {
    const orders = await Order.find({'document.result.operation.status': 'wait'});
    for (const order of orders) {
        await getSendedOrder(order);
    }
};

const invoiceManager = async() => {
    try {
        const orders = await Order.find({
            createdAt:{$gt:new Date(Date.now() - 24 * 7 * 60* 60 * 1000 )},
            invoiceCompleted: false,
        }).lean();
        console.log(new Date(), 'retryFailedInvoice');

        const regionIds = [];
        for (const order of orders) {
            regionIds.push(order.regionId);
        }
        const regions = await Region.find({ _id: { $in: regionIds } })
        const regionsMap = {};
        for (const region of regions) {
            regionsMap[region._id] = region;
        }

        for (const order of orders) {
            try {
                const {merchant, orderId, sessionId, smorodina_UID} = order;

                const {status} = await ttkpg.GetOrderStatus({
                    Merchant: merchant,
                    OrderID: orderId,
                    SessionID: sessionId,
                });
                
                let invoiceStatus;
                switch (status) {
                case 'APPROVED':
                    invoiceStatus = 2; //
                    break;
                case 'DECLINED':
                    invoiceStatus = 4; //
                    break;
                case 'CANCELED':
                    invoiceStatus = 5; //
                    break;
                case 'EXPIRED':
                    invoiceStatus = 5; //
                    break;
                default:
                    continue; 
                // throw new Error ('unexpected order status', status);
                }
                const consumer = await Consumer.findOne({
                  cons_UID: order.cons_UID,
                }).populate("ssdUri");
                const uri = getSsdUriByConsumer(consumer);
                if (!uri) {
                    console.log(`Incorrent ssdUri in ${consumer.cons_UID} consumer and ${order.email} email`)
                    continue;
                }
                const consInfo = await qPromConsumerInfo(consumer.cons_UID, uri);

                let smorodina = new Smorodina({
                  smorodina_UID,
                  merchant,
                  orderId,
                  sessionId,
                  typePaymentCode: regionsMap[order.regionId].pay.typePaymentCode,
                  pointCode: regionsMap[order.regionId].pay.pointCode,
                  idpu: regionsMap[order.regionId].pay.idpu,
                  lspu: regionsMap[order.regionId].pay.lspu,
                  abonentId: regionsMap[order.regionId].pay.abonentId,
                  service: regionsMap[order.regionId].pay.service,
                  cons_name: consInfo.cons_short_name
                }, regionsMap[order.regionId].pay.gateUrl);

                if (invoiceStatus === 2 ) {
                    const info = await ttkpg.GetOrderInformation({
                        Merchant: merchant,
                        OrderID: orderId,
                        SessionID: sessionId,
                    });
                    smorodina = new Smorodina(
                      {
                        smorodina_UID,
                        merchant,
                        orderId,
                        sessionId,
                        typePaymentCode:
                          regionsMap[order.regionId].pay.typePaymentCode,
                        pointCode: regionsMap[order.regionId].pay.pointCode,
                        idpu: regionsMap[order.regionId].pay.idpu,
                        lspu: regionsMap[order.regionId].pay.lspu,
                        abonentId: regionsMap[order.regionId].pay.abonentId,
                        service: regionsMap[order.regionId].pay.service,
                        PAN: info.Pan,
                        Brand: info.Brand,
                        ApprovalCode: info.ApprovalCode,
                        PayDate: info.PayDate,
                        cons_name: consInfo.cons_short_name
                      },
                      regionsMap[order.regionId].pay.gateUrl
                    );
                    const confirmSuccess = await smorodina.reqConfirmInvoice();
                    if (confirmSuccess) {
                          if (consumer) {
                            await sendEmail(
                              order.email,
                              getOrderNotificationText(
                                info.PayDate,
                                consumer.cons_full_name,
                                consumer.cons_inn,
                                consumer.cons_kpp,
                                order.description,
                                order.amount,
                                info.ApprovalCode,
                                sessionId,
                                orderId,
                                info.Brand,
                                info.Pan,
                                regionsMap[order.regionId].fullName,
                                info.feeCalculationResult
                              ),
                              "Уведомление об успешной оплате ЛКЮЛ"
                            );
                          }
                        
                        await Order.updateOne({orderId}, {$set:{invoiceCompleted : true}});
                        const result = await sendOrder(null, null, order);
                        console.log('sendingOrder', JSON.stringify(result));

                    } 
                } else {
                    const updateSuccess = await smorodina.reqUpdateInvoice(invoiceStatus);
                    if (updateSuccess) {
                        await Order.updateOne({orderId}, {$set:{invoiceCompleted : true}});
                    }
                }

            } catch (e) {
                console.log(e);
            }
        }
    } catch (e) {
        console.log(e);
    }
};

schedule.scheduleJob('0 0 0 * * *', checkConsumersSsd);
schedule.scheduleJob('0 */10 * * * *', getDocInfo);
schedule.scheduleJob('0 */5 * * * *', async () => {
    // await sendingOrderSchedule();
    await updateSendedOrderStatus();
});
schedule.scheduleJob('0 */2 * * * *', invoiceManager);


