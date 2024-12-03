const rpn = require('request-promise-native');
const {SBIS} = require('../config');
const boom = require('boom');

module.exports = async (session, cons_inn, cons_kpp, type = 'ДоговорИсх') => {
    const options = {
        method: 'POST',
        uri: SBIS.uri + '/service/?srv=1',
        headers: {
            ...SBIS.headers,
            'X-SBISSessionID': session
        },
        body: {
            'jsonrpc': '2.0',
            'method': 'СБИС.СписокДокументов',
            'params': {
                'Фильтр': {
                    'Тип': type,
                    'НашаОрганизация': {
                        'СвЮЛ': {
                            'ИНН': cons_inn,
                            'КПП': cons_kpp
                        }
                    },
                    'Навигация': {
                        'РазмерСтраницы': '500'
                    }
                }
            },
            'id': 0
        },
        json: true,
        rejectUnauthorized: false
    };
    const options2 = {
        method: 'POST',
        uri: SBIS.uri + '/service/?srv=1',
        headers: {
            ...SBIS.headers,
            'X-SBISSessionID': session
        },
        body: {
            'jsonrpc': '2.0',
            'method': 'СБИС.СписокДокументов',
            'params': {
                'Фильтр': {
                    'Тип': type,
                    'Состояние': 'Удаленные',
                    'НашаОрганизация': {
                        'СвЮЛ': {
                            'ИНН': cons_inn,
                            'КПП': cons_kpp
                        }
                    },
                    'Навигация': {
                        'РазмерСтраницы': '500'
                    }
                }
            },
            'id': 0
        },
        json: true,
        rejectUnauthorized: false
    };
    console.log(options, options.body.params['Фильтр']);
    return Promise.all([
        rpn(options),
        rpn(options2)
    ])
        .then(([result, result2]) => {
            console.log(type, result.result['Документ'].length, result2.result['Документ'].length);
            if (result.result && result2.result) result.result['Документ'].push(...result2.result['Документ']);
            return result;
        })
        .catch(err => {
            if (err.statusCode === 401) throw new boom(err.message, {statusCode: 421});
            throw new boom(err.message, err);
        });
};
