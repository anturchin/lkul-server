const rpn = require('request-promise-native');
const {SBIS} = require('../config');
const boom = require('boom');

module.exports = async (session, contr_UID) => {
    const options = {
        method: 'POST',
        uri: SBIS.uri + '/service/?srv=1',
        headers: {
            ...SBIS.headers,
            'X-SBISSessionID': session
        },
        body: {
            'jsonrpc': '2.0',
            'method': 'СБИС.ПрочитатьДокумент',
            'params': {
                'Документ': {
                    'Идентификатор': contr_UID
                }
            },
            'id': 0
        },
        json: true,
        rejectUnauthorized: false
    };
    console.log('GET DOCUMENT', JSON.stringify(options));
    return rpn(options)
        .then(result => {
            console.log('RESULT', JSON.stringify(result));
            return result;
        })
        .catch(err => {
            if (err.statusCode === 401) throw new boom(err.message, {statusCode: 421});
            throw new boom(err.message, err);
        });
};
