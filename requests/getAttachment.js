const rpn = require('request-promise-native');
const {SBISUri} = require('../config');
const boom = require('boom');
const { log } = require('./requests.log');

module.exports = async (data, session, sbis_url) => {
    const {contr_UID} = data;
    const options = {
        method: 'POST',
        uri: (sbis_url || SBISUri) + '/sbis/getAttachment',
        headers: {
            'session': session
        },
        formData: {
            document_id: contr_UID,
            number: 0
        },
        json: true,
        rejectUnauthorized: false
    };

    return rpn(options)
        .then(result => {
            log("getAttachment", options, result);
            return result;
        })
        .catch(err => {
            log('getAttachment', options, err.message);
            throw new boom(err.message, err);
        });
};
