const rpn = require('request-promise-native');
const {SBISUri} = require('../config');
const boom = require('boom');
const { log } = require('./requests.log');

module.exports = async (data, session, sbis_url) => {
    const options = {
        method: 'POST',
        uri: (sbis_url || SBISUri) + '/sbis/createDocument',
        headers: {
            'session': session,
            'Content-Type': 'application/json'
        },
        body: data,
        json: true,
        rejectUnauthorized: false
    };
    if (!options.body.contr_scan) throw new boom('contr_scan отсутствует при конечном запросе', {statusCode: 400});
    const {contr_scan} = options.body;
    options.body.contr_scan = null;
    options.body.contr_scan = contr_scan;
    return rpn(options)
        .then(result => {
            log('createDocument', options, result);
            return result;
        })
        .catch(err => {
            log('createDocument', options, err.message);
            throw new boom(err.message, err);
        });
};
