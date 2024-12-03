const q = 'qPromContractScanDoc';
const rpn = require('request-promise-native');
const boom = require('boom');
const { log } = require('./requests.log');

module.exports = async (doc_uid, doc_type, sbis_url) => {
    const options = {
        method: 'POST',
        uri: (sbis_url) + '/' + q,
        json: true,
        body: {
            doc_uid,
            doc_type
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