const rpn = require('request-promise-native');
const q = 'qPromConsumerContractList';
const boom = require('boom');
const { log } = require('./requests.log');

module.exports = async (cons_uid, contr_status, sbis_url) => {
    const data = {
        cons_uid
    };
    if (contr_status) data.contr_status = contr_status;
    const options = {
        method: 'POST',
        uri: (sbis_url) + '/' + q,
        json: true,
        formData: data,
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
