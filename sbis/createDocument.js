const rpn = require('request-promise-native');
const {SBIS} = require('../config');
const boom = require('boom');
const moment = require('moment');

module.exports = async (session, cons_inn, cons_kpp, _receiver_name, inn, kpp, description, contr_UID, contr_num, contr_date, type, baseId, baseType = 'Обычная связь', subtype) => {
    const body = {
        'jsonrpc': '2.0',
        'method': 'СБИС.ЗаписатьДокумент',
        'params': {
            'Документ': {
                'Дата': moment(contr_date).format('DD.MM.YYYY'),
                'Номер': contr_num,
                'Идентификатор': contr_UID,
                'Контрагент': {
                    'СвЮЛ': {
                        'ИНН': inn,
                        'КПП': kpp
                    }
                },
                'НашаОрганизация': {
                    'СвЮЛ': {
                        'ИНН': cons_inn,
                        'КПП': cons_kpp
                    }
                },
                'Примечание': subtype + ' - ' + description,
                'Редакция': [
                    {
                        'ПримечаниеИС': 'РеализацияТоваровУслуг:8bf669c4-042e-4854-b21b-673e8067e83e'
                    }
                ],
                'Тип': type
            }
        },
        'id': 0
    };
    if (baseId) {
        body.params['Документ']['ДокументОснование'] = [{
            'Документ': {
                'Идентификатор': baseId
            },
            'ВидСвязи': baseType
        }];
    }
    const options = {
        method: 'POST',
        uri: SBIS.uri + '/service/?srv=1',
        headers: {
            ...SBIS.headers,
            'X-SBISSessionID': session
        },
        body,
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
