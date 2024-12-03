const xml2js = require('xml2js');
const {baseUri} = require('../config').ttkpg;
const https = require('https');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const {caPath, certPath, keyPath} = require('../config').payment;

const RESULT_CODE = {
    '00': 'успешно',
    '10':
      'интернет–магазин не имеет доступа к операции создания заказа или такой интернет–магазин не зарегистрирован',
    '30': 'неверный формат сообщения (нет обязательных полей и т.д.)',
    '54': 'недопустимая операция',
    '72': 'пустой ответ POS-драйвера авторизационной системы',
    '95': 'ON-PAYMENT или LOCKED, статус остается прежним',
    '96': 'системная ошибка',
    '97': 'ошибка связи с POS–драйвером',
};

module.exports = {
    request: () => {
        const ca = fs.readFileSync(path.resolve(caPath));
        const cert = fs.readFileSync(path.resolve(certPath));
        const key = fs.readFileSync(path.resolve(keyPath));
        const a = axios.create({
            baseURL: baseUri,
            httpsAgent: new https.Agent({
                ca: ca,
                cert: cert,
                key: key,
            })
        });
        return a;
    },

    /**
   * Создания заказа
   */
    CreateOrder: async function (params) {
        return createOrder(this.request(), params);
    },

    /**
     * Статус платежа
     */
    GetOrderStatus: async function (params) {
        return GetOrderStatus(this.request(), params);
    },

    /**
     * Информацию платежа
     */
    GetOrderInformation: async function (params) {
        return GetOrderInformation(this.request(), params);
    },
    Purchase: async function (params) {
        return Purchase(this.request(), params);
    }
};

const createOrder = async (req, params) => {
    let result;
    const data = make({
        TKKPG: {
            Request: {
                Operation: 'CreateOrder',
                Language: 'RU',
                Order: params,
            },
        },
    });
  
    console.log('CREATE ORDER', JSON.stringify(data));
    
    result = await req.post('/exec', data).catch(err => console.error(err.toJSON()));
    result = await parse(result.data);
    console.log('PARSE RESULT', JSON.stringify(result));
  
    const resultStatus = result.TKKPG.Response[0].Status[0] || result.TKKPG.Response[0].Status;
  
    if (resultStatus !== '00') {
        return {
            error: `Processing error occured while create order [${
                RESULT_CODE[resultStatus] || 'UNKNOWN'
            }]`,
            status: resultStatus,
        };
    }
  
    const XmlOrder = result.TKKPG.Response[0].Order[0];
    const id_order = XmlOrder.OrderID[0];
    const id_session = XmlOrder.SessionID[0];
    const url = `${XmlOrder.URL[0]}?SessionID=${id_session}&OrderID=${id_order}`;
  
    const OrderResult = { orderId: id_order, sessionId: id_session, url, status: resultStatus, };
    return OrderResult;
};

const make = (object) => {
    const builder = new xml2js.Builder({
        headless: true,
    });
    return builder.buildObject(object);
};
const parse = (xmlString) => {
    return new Promise((resolve, reject) => {
        xml2js.parseString(xmlString, (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
};

const GetOrderInformation = async (req, props) => {
    let result;
  
    const data = make({
        TKKPG: {
            Request: {
                Operation: 'GetOrderInformation',
                Language: 'RU',
                ShowOperations: true,
                Order: {
                    Merchant: props.Merchant,
                    OrderID: props.OrderID,
                },
                SessionID: props.SessionID,
                ShowParams: true
            },
        },
    });
  
  
    result = await req.post('/exec', data);
    result = await parse(result.data);
  
    const errorResult = result.TKKPG;
  
    if (errorResult) {
        throw errorResult.Response[0].Status[0];
    }
  
    const resultInformation = result.Order.row[0];

    const PaymentInformationResult = {
        OrderID: props.OrderID,
        Merchant: resultInformation.MerchantID[0],
        SessionID: resultInformation.SessionID[0],
        // status lowercase!
        OrderStatus: resultInformation.Orderstatus[0],
        OrderLanguage: resultInformation.OrderLanguage[0],
        OrderType: resultInformation.OrderType[0],
        OrderSubType: resultInformation.OrderSubType[0],
        PayDate: resultInformation.payDate[0],
        Receipt: resultInformation.Receipt[0],
        RefundAmount: resultInformation.RefundAmount[0],
        RefundCurrency: resultInformation.RefundCurrency[0],
        RefundDate: resultInformation.RefundDate[0],
        twoId: resultInformation.twoId[0],
        twoDate: resultInformation.TWODate[0],
        twoTime: resultInformation.TWOTime[0],
        feeCalculationResult: resultInformation.OrderParams[0].row.find(r => r.PARAMNAME[0] == 'feeCalculationResult').VAL[0],
        Brand: resultInformation.OrderParams[0].row.find(r => r.PARAMNAME[0] == 'CardBrand').VAL[0],
        Pan: resultInformation.OrderParams[0].row.find(r => r.PARAMNAME[0] == 'PAN').VAL[0],
        ApprovalCode: resultInformation.OrderParams[0].row.find(r => r.PARAMNAME[0] == 'APPROVAL').VAL[0]
    };
  
    return PaymentInformationResult;
};
const GetOrderStatus = async (req, props) => {
    let result;
  
    const data = make({
        TKKPG: {
            Request: {
                Operation: 'GetOrderStatus',
                Language: 'RU',
                Order: {
                    Merchant: props.Merchant,
                    OrderID: props.OrderID,
                },
                SessionID: props.SessionID,
            },
        },
    });
  
    result = await req.post('/exec', data);
    console.log('============get order status req======', data, '============get order status res======', result.data);
    result = await parse(result.data);
  
    const resultStatus = result.TKKPG.Response[0].Status[0];
    if (resultStatus !== '00') {
        return {};
    }
  
    const XmlOrder = result.TKKPG.Response[0].Order[0];
  
    const PaymentInformationResult = {
        Merchant: props.Merchant,
        SessionID: props.SessionID,
        OrderID: XmlOrder.OrderID[0],
        status: XmlOrder.OrderStatus[0],
    };
  
    return PaymentInformationResult;
};
const Purchase = async (req, props) => {
    let result;
    const orderObject = {
        TKKPG: {
            Request: {
                Operation: 'Purchase',
                Order: {
                    Merchant: props.Merchant,
                    OrderID: props.OrderID,
                },
                SessionID: props.SessionID,
                Amount: props.Amount,
                Currency: 643,
                eci: 52,
            },
        },
    };
  
    const data = make(orderObject);
  
    result = await req.post('/exec', data);
  
    result = await parse(result.data);
  
    if (result.out) {
        result = result.out.XMLOut[0].Message[0];
    }
    if (result.TKKPG) {
        result = result.TKKPG.Response[0];
    }
  
    if (result) {
        if (result.Status && result.Status[0]) {
            throw new Error(`Purchase failed, status code ${result.Status[0]}`);
        }
  
        return result;
    }
    throw new Error(`Purchase failed, ${JSON.stringify(result)}`);
};
