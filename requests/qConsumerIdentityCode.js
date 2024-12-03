const q = 'qConsumerIdentityCode';
const rpn = require('request-promise-native');
const boom = require('boom');
const { log } = require('./requests.log');

module.exports = async (cons_UIDs, sbis_url) => {
    if (!cons_UIDs || !cons_UIDs.length) return {};
    const consumersid = cons_UIDs.map(c => {
        return {
            cons_uid: c
        };
    });
    const options = {
        method: 'POST',
        uri: (sbis_url) + '/' + q,
        json: true,
        body: {
            consumersid
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