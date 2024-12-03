const rpn = require('request-promise-native');
const {SBIS} = require('../config');
const boom = require('boom');

module.exports = async (session, base64File, fileName, contr_UID) => {
    const options = {
        method: 'POST',
        uri: SBIS.uri + '/service/?srv=1',
        headers: {
            ...SBIS.headers,
            'X-SBISSessionID': session
        },
        body: {
            'jsonrpc': '2.0',
            'id': 1,
            'method': 'СБИС.ЗаписатьВложение',
            'params': {
                'Документ': {
                    'Идентификатор': contr_UID,
                    'Этап': {
                        'Название': 'Отправка',
                        'Действие': [
                            {
                                'Название': 'Отправить'
                            }
                        ]
                    },
                    'Вложение': [
                        {
                            'Файл': {
                                'Имя': fileName,
                                'ДвоичныеДанные': base64File
                            }
                        }
                    ]
                }
            }
        },
        json: true,
        rejectUnauthorized: false
    };
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
