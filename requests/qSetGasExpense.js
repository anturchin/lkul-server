const q = 'qSetGasExpense';
const rpn = require('request-promise-native');
const moment = require('moment');
const boom = require('boom');
const {EquipmentValuesSending} = require('../models');
const checkDateForSetValues = require('../libs/checkDateForSetValues');
const { log } = require('./requests.log');

module.exports = async (data, sbis_url) => {
    const {equipment_uuid, location_uuid, Met_uuid, cons_UID, Dt_value, Value, contr_UID} = data;
    
    const day = moment(Dt_value).startOf('day').toDate().toISOString().slice(0, 19);
    if (!checkDateForSetValues(day)) {
        throw boom.conflict('Дата отправки данных некорректна.');
    }
    const formData = {
        equipment_uuid,
        location_uuid,
        Met_uuid,
        Cons_UID: cons_UID,
        Dt_value: day,
        Contr_uid: contr_UID,
        Value: parseInt(Value)
    };
    const options = {
        method: 'POST',
        uri: (sbis_url) + '/' + q,
        json: true,
        formData,
        rejectUnauthorized: false
    };
    return rpn(options)
        .then(async result => {
            try {
                let equip = await EquipmentValuesSending.findOne();
                if (!equip) equip = new EquipmentValuesSending({equipments: []});
                if (!equip.equipments) equip.equipments = [];
                equip.equipments.push(formData);
                await equip.save();
            } catch (err) {
                console.error(err);
            }
            log(q, options, result);
            return result;
        })
        .catch(err => {
            log(q, options, err.message);
            throw new boom(err.message, err);
        });
};
