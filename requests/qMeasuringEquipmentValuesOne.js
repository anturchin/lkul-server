const q = 'qMeasuringEquipmentValuesOne';
const rpn = require('request-promise-native');
const boom = require('boom');
const moment = require('moment');
const { log } = require('./requests.log');

module.exports = async (cons_uid, met_uuid, sbis_url, dateFrom = new Date(0), dateTo = new Date()) => {
    const options = {
        method: 'POST',
        uri: (sbis_url) + '/' + q,
        json: true,
        formData: {
            cons_uid,
            met_uuid,
            dateFrom: moment(dateFrom).startOf('day').toDate().toISOString().slice(0, 19),
            dateTo: moment(dateTo).endOf('day').toDate().toISOString().slice(0, 19)
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