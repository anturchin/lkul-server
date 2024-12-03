const rpn = require('request-promise-native');
const {APIUri} = require('../config');
const boom = require('boom');
const { log } = require('./requests.log');

module.exports = async (uri, q, formData, jsonData, method = 'POST') => {
    const options = {
        method,
        uri: (uri || APIUri) + '/' + q,
        json: true,
        rejectUnauthorized: false
    };
    if (formData) options.formData = formData;
    else if (jsonData) options.body = jsonData;
    console.log(q, JSON.stringify({formData, jsonData}));
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