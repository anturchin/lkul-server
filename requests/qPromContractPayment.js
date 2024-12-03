const q = 'qPromContractPayment';
const rpn = require('request-promise-native');
const moment = require('moment');
const boom = require('boom');
const { log } = require('./requests.log');

module.exports = async (data, sbis_url) => {
    const {contr_UID, st_date, end_date} = data;
    const options = {
        method: 'POST',
        uri: (sbis_url) + '/' + q,
        json: true,
        formData: {
            contr_UID,
            st_date: moment(st_date).toDate().toISOString().slice(0, 19),
            end_date: moment(end_date).toDate().toISOString().slice(0, 19)
        },
        rejectUnauthorized: false
    };
    return rpn(options)
        .then(result => {
            log(q, options, result);
            return result;
        })
        .catch(err => {
            log(q, options, err.message);
            throw new boom(err.message, err);
        });
};
