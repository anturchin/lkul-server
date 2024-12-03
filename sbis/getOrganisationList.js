
const rpn = require('request-promise-native');
const {SBIS} = require('../config');
const boom = require('boom');

module.exports = async (session) => {
    const options = {
        method: 'POST',
        uri: SBIS.uri + '/auth/service?srv=1',
        headers: {
            ...SBIS.headers,
            'X-SBISSessionID': session
        },
        body: {
            'jsonrpc': '2.0',
            'method': 'СБИС.СписокНашихОрганизаций',
            'params': {
                'Фильтр': {}
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
