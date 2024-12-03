const rpn = require('request-promise-native');
const {SBIS} = require('../config');
const boom = require('boom');
const moment = require('moment');

module.exports = async (session, inn, kpp, date) => {
    const options = {
        method: 'POST',
        uri: SBIS.uri + '/service/?srv=1',
        headers: {
            ...SBIS.headers,
            'X-SBISSessionID': session
        },
        body: {
            'jsonrpc': '2.0',
            'method': 'СБИС.СписокИзменений',
            'params': {
                'Фильтр': {
                    'ДатаВремяС': moment(date).add(3, 'hours').format('DD.MM.YYYY HH.mm.ss'),
                    'НашаОрганизация': {
                        'СвЮЛ': {
                            'ИНН': inn,
                            'КПП': kpp
                        }
                    },
                    'ПолныйСертификатЭП': 'Нет'
                }
            },
            'id': 0
        },
        json: true,
        rejectUnauthorized: false
    };
    console.log(options.body.method, options.body.params['Фильтр']);
    return rpn(options)
        .then(result => {
            return result;
        })
        .catch(err => {
            if (err.statusCode === 401) throw new boom(err.message, {statusCode: 421});
            throw new boom(err.message, err);
        });
};
