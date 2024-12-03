const rpn = require('request-promise-native');
const q = 'qPromConsumerInfo';
const boom = require('boom');
const moment = require('moment');
const { log } = require('./requests.log');

module.exports = async (cons_uid, sbis_url) => {
    const options = {
        method: 'POST',
        uri: (sbis_url) + '/' + q,
        json: true,
        formData: {
            cons_uid,
            date: moment(new Date(0)).format('YYYY-MM-DDTHH:mm:ss')
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
