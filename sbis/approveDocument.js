const rpn = require('request-promise-native');
const {SBIS} = require('../config');
const boom = require('boom');

module.exports = async (session, sert_token, contr_UID, files) => {
    const attachments = files.map(file => {
        const {doc_uid, sign, fileName} = file;
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
                                'Название': 'Утвердить',
                                'Сертификат': [
                                    {
                                        'Отпечаток': sert_token
                                    }
                                ]
                            }
                        ],
                        'Название': 'Утверждение'
                    }
                }
            },
            'id': 0
        },
        json: true,
        rejectUnauthorized: false
    };
    console.log('APPROVE', JSON.stringify(options));
    return rpn(options)
        .then(result => {
            console.log(JSON.stringify(result));
            return result;
        })
        .catch(err => {
            if (err.statusCode === 401) throw new boom(err.message, {statusCode: 421});
            throw new boom(err.message, err);
        });
};
