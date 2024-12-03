const q = 'qPromConsumerPayment';
const rpn = require('request-promise-native');
const moment = require('moment');
const boom = require('boom');
const { log } = require('./requests.log');

module.exports = async (cons_UID, st_date, end_date, sbis_url) => {
    const options = {
        method: 'POST',
        uri: (sbis_url) + '/' + q,
        json: true,
        formData: {
            cons_UID,
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