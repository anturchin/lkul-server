const rpn = require('request-promise-native');
const boom = require('boom');
const { log } = require('./requests.log');

module.exports = async (_cons_inn, _cons_kpp, sbis_url) => {
    const options = {
        method: 'GET',
        uri: (sbis_url) + '/qPromConsumer',
        json: true,
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
