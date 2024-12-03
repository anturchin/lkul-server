const q = 'qDelScanEquipmentValues';
const rpn = require('request-promise-native');
const boom = require('boom');
const { log } = require('./requests.log');

module.exports = async (file_id, sbis_url) => {
    const options = {
        method: 'POST',
        uri: (sbis_url) + '/' + q,
        json: true,
        body: {
            file_id
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