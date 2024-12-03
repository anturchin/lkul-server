const rpn = require('request-promise-native');
const {SBIS} = require('../config');
const boom = require('boom');

module.exports = async (session, sert_token, contr_UID, files, comment) => {
    const attachments = files.map(file => {
        const {doc_uid, fileName, sign} = file;
        console.log(doc_uid, fileName, sign);
        return {
            'Идентификатор': doc_uid,
            'Подпись': [
                {
                    'Файл': {
                        'ДвоичныеДанные': sign,
                        'Имя': `${fileName}.sgn`
                    }
                }
            ]
        };
    });
    const options = {
        method: 'POST',
        uri: SBIS.uri + '/service/?srv=1',
        headers: {
            ...SBIS.headers,
            'X-SBISSessionID': session
        },
        body: {
            'jsonrpc': '2.0',
            'method': 'СБИС.ВыполнитьДействие',
            'params': {
                'Документ': {
                    'Идентификатор': contr_UID,
                    'Этап': {
                        'Вложение': attachments,
                        'Действие': [
                            {
                                'Комментарий': comment,
                                'Название': 'Аннулировать',
                                'Сертификат': [
                                    {
                                        'Отпечаток': sert_token
                                    }
                                ]
                            }
                        ],
                        'Название': 'Аннулирование'
                    }
                }
            },
            'id': 0
        },
        json: true,
        rejectUnauthorized: false
    };
    console.log(options.body['params']['Документ'], options.body['params']['Документ']['Этап']['Действие'][0]['Сертификат']);
    return rpn(options)
        .then(result => {
            return result;
        })
        .catch(err => {
            if (err.statusCode === 401) throw new boom(err.message, {statusCode: 421});
            throw new boom(err.message, err);
        });
};
