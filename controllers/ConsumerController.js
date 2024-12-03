const qPromConsumerPayment = require('../requests/qPromConsumerPayment');
const qPromUnknownPayment = require('../requests/qPromUnknownPayment');

exports.qPromConsumerPayment = async (subLogin, st_date, end_date) => {
    const {cons_UID, ssd_uri} = subLogin;
    const result = await qPromConsumerPayment(cons_UID, st_date, end_date, ssd_uri);
    return result;
};

exports.qPromUnknownPayment = async (subLogin, st_date, end_date) => {
    const {cons_UID, ssd_uri} = subLogin;
    const result = await qPromUnknownPayment(cons_UID, st_date, end_date, ssd_uri);
    return result;
};