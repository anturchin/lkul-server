const q = 'qReportPaymentVolume';
const rpn = require('request-promise-native');
const boom = require('boom');
const { log } = require('./requests.log');

module.exports = async (cons_uid, contr_uid, st_date1 = '2019-01-01T00:00:00', end_date1 = '2019-12-31T00:00:00', st_date2 = '2018-01-01T00:00:00', end_date2 = '2018-12-31T00:00:00', data_group = 0, cons_point_uid, sbis_url) => {
    const options = {
        method: 'POST',
        uri: (sbis_url) + '/' + q,
        json: true,
        body: {
            cons_uid,
            contr_uid,
            st_date1,
            end_date1,
            st_date2,
            end_date2,
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