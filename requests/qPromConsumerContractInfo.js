const rpn = require('request-promise-native');
const q = 'qPromConsumerContractInfo';
const boom = require('boom');
const { log } = require('./requests.log');

module.exports = async (contr_UID, sbis_url) => {
    const options = {
        method: 'POST',
        uri: (sbis_url) + '/' + q,
        json: true,
        formData: {
            contr_uid: contr_UID,
            contr_UID
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
