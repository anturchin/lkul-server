const q = 'findAllByConsShortNameAndConsINN';
const rpn = require('request-promise-native');
const boom = require('boom');
const { log } = require('./requests.log');

module.exports = async (cur_emale = null, sbis_url, page_number = 0, page_count = 20, cons_INN = '', consShortName = '', cons_uids = [], sortBy = 'cons_INN', desc = false, lkp, cons_KPP) => {
    const options = {
        method: 'POST',
        uri: (sbis_url) + '/' + q,
        json: true,
        body: {
            consShortName,
            cons_INN,
            page_number,
            page_count,
            cur_emale: cur_emale || null,
            cons_KPP,
            cons_uids,
            sortBy: [sortBy],
            isASC: desc,
            lkp
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