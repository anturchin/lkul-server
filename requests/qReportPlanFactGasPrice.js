const q = 'qReportPlanFactGasPrice';
const rpn = require('request-promise-native');
const boom = require('boom');
const moment = require('moment');
const { log } = require('./requests.log');

module.exports = async (cons_uid, contr_uid, st_date = '2019-01-01T00:00:00', end_date = '2019-12-31T00:00:00', data_group = 0, sbis_url, cons_point_uid) => {
    const options = {
        method: 'POST',
        uri: (sbis_url) + '/' + q,
        json: true,
        body: {
            cons_uid,
            contr_uid,
            st_date: moment(st_date).toDate().toISOString().slice(0, 19),
            end_date: moment(end_date).toDate().toISOString().slice(0, 19),
            data_group,
            cons_point_uid
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