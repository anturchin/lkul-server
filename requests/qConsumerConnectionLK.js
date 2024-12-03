const q = 'qConsumerConnectionLK';
const rpn = require('request-promise-native');
const boom = require('boom');
const { log } = require('./requests.log');

module.exports = async (cons_connect_lk, cons_uid, sbis_url, cons_email, needRemove = false, cons_connect_edo) => {
    const options = {
        method: 'POST',
        uri: (sbis_url) + '/' + q,
        json: true,
        body: {
            cons_connect_lk,
            cons_uid,
            cons_email,
            needRemove,
            cons_connect_edo,
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