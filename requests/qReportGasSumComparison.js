const q = 'qReportGasSumComparison';
const rpn = require('request-promise-native');
const boom = require('boom');
const { log } = require('./requests.log');

module.exports = async (cons_uid, contr_uid, st_date = '2019-01-01T00:00:00', end_date = '2019-12-31T00:00:00', data_group = 0, sbis_url) => {
    const options = {
        method: 'POST',
        uri: (sbis_url) + '/' + q,
        json: true,
        body: {
            cons_uid,
            st_date,
            end_date,
            data_group,
            contr_uid
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