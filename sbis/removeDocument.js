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
            'method': 'СБИС.УдалитьДокумент',
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
    console.log(options);
    return rpn(options)
        .then(result => {
            if (result && result.executed === false) throw new boom('Документ не удален', {statusCode: 400});
            return result;
        })
        .catch(err => {
            throw new boom(err.message, err);
        });
};
