const q = 'qSetEquipmentValues';
const rpn = require('request-promise-native');
const moment = require('moment');
const boom = require('boom');
const {EquipmentValuesSending} = require('../models');
const { log } = require('./requests.log');
// const checkDateForSetValues = require('../libs/checkDateForSetValues');

module.exports = async (data, sbis_url) => {
    const {location_uuid: cons_point_uid, Met_uuid: Met_uid, cons_UID: cons_uid, Dt_value, Value, GasVolume, Contr_uid: contr_uid, equipment_uuid: equipment_uid, endday = false} = data;
    
    const day = moment(Dt_value).startOf('day').toDate().toISOString().slice(0, 19);
    // if (!checkDateForSetValues(day)) {
    //     throw boom.conflict('Дата отправки данных некорректна.');
    // }
    const formData = {
        cons_point_uid,
        Met_uid,
        cons_uid,
        Dt_value: day,
        equipment_uid,
        Value: parseInt(Value) || 0,
        GasVolume: parseInt(GasVolume) || 0,
        contr_uid,
        endday: String(endday)
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