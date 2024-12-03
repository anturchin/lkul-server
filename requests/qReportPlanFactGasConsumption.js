const q = 'qReportPlanFactGasConsumption';
const rpn = require('request-promise-native');
const boom = require('boom');
const moment = require('moment');
const { log } = require('./requests.log');

module.exports = async (cons_uid, contr_uid, cons_point_uid, st_date = new Date(0), end_date = new Date(), data_group = 0, sbis_url) => {
    const options = {
        method: 'POST',
        uri: (sbis_url) + '/' + q,
        json: true,
        body: {
            cons_uid,
            contr_uid,
            cons_point_uid,
            st_date2: moment(st_date).toDate().toISOString().slice(0, 19),
            end_date2: moment(end_date).toDate().toISOString().slice(0, 19),
            data_group
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