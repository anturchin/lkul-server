
const rpn = require('request-promise-native');
const {SBIS} = require('../config');
const boom = require('boom');

module.exports = async (sertList) => {
    const options = {
        method: 'POST',
        uri: SBIS.uri + '/auth/service/',
        headers: {
            ...SBIS.headers
        },
        body: {
            'jsonrpc': '2.0',
            'method': 'СБИС.СписокСертификатовДляАутентификации',
            'params': {
                'Параметр': {
                    'Сертификат': sertList
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
            return result;
        })
        .catch(err => {
            if (err.statusCode === 401) throw new boom(err.message, {statusCode: 421});
            throw new boom(err.message, err);
        });
};
