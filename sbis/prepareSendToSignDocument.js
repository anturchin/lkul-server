const rpn = require('request-promise-native');
const {SBIS} = require('../config');
const boom = require('boom');

module.exports = async (session, sert, contr_UID) => {
    const options = {
        method: 'POST',
        uri: SBIS.uri + '/service/?srv=1',
        headers: {
            ...SBIS.headers,
            'X-SBISSessionID': session
        },
        body: {
            'jsonrpc': '2.0',
            'method': 'СБИС.ПодготовитьДействие',
            'params': {
                'Документ': {
                    'Идентификатор': contr_UID,
                    'Этап': {
                        'Действие': {
                            'Название': 'Отправить',
                            'Сертификат': {
                                'Отпечаток': sert
                            }
                        },
                        'Название': 'Отправка'
                    }
                }
            },
            'id': 0
        },
        json: true,
        rejectUnauthorized: false
    };
    console.log('PREPARE send', JSON.stringify(options));
    return rpn(options)
        .then(result => {
            return result;
        })
        .catch(err => {
            console.error(JSON.stringify(err));
            if (err.statusCode === 401) throw new boom(err.message, {statusCode: 421});
            throw new boom(err.message, err);
        });
};
