const q = 'qMeasuringEquipmentInfoOne';
const rpn = require('request-promise-native');
const boom = require('boom');
const moment = require('moment');
const { log } = require('./requests.log');

module.exports = async (cons_uid, location_uuid, sbis_url, dateFrom, dateTo) => {
    const options = {
        method: 'POST',
        uri: (sbis_url) + '/' + q,
        json: true,
        formData: {
            cons_uid,
            location_uuid
        },
        rejectUnauthorized: false
    };
    if (dateFrom && dateTo) {
        options.formData.dateFrom = moment(dateFrom).startOf('day').toDate().toISOString().slice(0, 19);
        options.formData.dateTo = moment(dateTo).endOf('day').toDate().toISOString().slice(0, 19);
    }
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