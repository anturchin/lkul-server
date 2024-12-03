const rpn = require('request-promise-native');
const {SBIS} = require('../config');
const boom = require('boom');
const moment = require('moment');

module.exports = async (session, type, from = new Date(0)) => {
    const options = {
        method: 'POST',
        uri: SBIS.uri + '/service/?srv=1',
        headers: {
            ...SBIS.headers,
            'X-SBISSessionID': session
        },
        body: {
            'jsonrpc': '2.0',
            'method': 'СБИС.СписокДокументовПоСобытиям',
            'params': {
                'Фильтр': {
                    'ДатаС': moment(from).format('DD.MM.YYYY'),
                    'ТипРеестра': type,
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
    console.log(options);
    const options2 = {
        method: 'POST',
        uri: SBIS.uri + '/service/?srv=1',
        headers: {
            ...SBIS.headers,
            'X-SBISSessionID': session
        },
        body: {
            'jsonrpc': '2.0',
            'method': 'СБИС.СписокДокументовПоСобытиям',
            'params': {
                'Фильтр': {
                    'ДатаС': moment(from).format('DD.MM.YYYY'),
                    'ТипРеестра': type,
                    'Состояние': 'Удаленные',
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
    return Promise.all([
        rpn(options),
        rpn(options2)
    ])
        .then(([result, result2]) => {
            console.log(result, result2);
            if (result.result && result2.result) result.result['Реестр'].push(...result2.result['Реестр']);
            return result;
        })
        .catch(err => {
            if (err.statusCode === 401) throw new boom(err.message, {statusCode: 421});
            throw new boom(err.message, err);
        });
};
