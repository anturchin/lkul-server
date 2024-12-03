const qMeasuringEquipmentInfoAll = require('../requests/qMeasuringEquipmentInfoAll');
const qMeasuringEquipmentInfoOne = require('../requests/qMeasuringEquipmentInfoOne');
const Contract = require('./ContractController');
const qMeasuringEquipmentValuesAll = require('../requests/qMeasuringEquipmentValuesAll');
const {notFound, badRequest} = require('boom');
const moment = require('moment');
const ERRORS = require('../libs/errors');
const { getSsdUriByCons_UID } = require('../libs/getSsdUriByConsumer');
const equipmentsFilter = require('../libs/equipmentFilter');

exports.list = async (subLogin, query) => {
    const {contr_UID, equipment_type = null, work = null} = query;
    const {cons_UID} = subLogin;
    const uri = await getSsdUriByCons_UID(cons_UID);
    if (!uri) {
        throw notFound('Отсутствуют источники данных.');
    }
    const locations = await qMeasuringEquipmentInfoAll(cons_UID, uri);
    let contract = null;
    try {
        contract = contr_UID ? await Contract.getById(subLogin, contr_UID) : null;
    } catch (err) {
        console.error(err);
    }
    if (contr_UID && (!contract || !contract.locations || !contract.locations[0])) {
        return [];
    }
    return locations.filter(loc => {
        if (!contr_UID) {
            if (equipment_type || work === 'true') {
                for (const met of loc.Mets) {
                    met.equipmens = equipmentsFilter(met.equipmens, equipment_type, work);
                }
            }
            return true;
        }
        if (!contract.locations) contract.locations = [];
        for (const contractMet of contract.locations) {
            if (contractMet.location_UID === loc.location_uuid) {
                if (equipment_type || work === 'true') {
                    for (const met of loc.Mets) {
                        met.equipmens = equipmentsFilter(met.equipmens, equipment_type, work);
                    }
                }
                return true;
            }
        }
    });
};

exports.metsByLocationUID = async (subLogin, location_uuid, equipment_type = null, work = null, st_date, end_date) => {
    const {cons_UID} = subLogin;
    if (!cons_UID) throw badRequest('Введите cons_UID');
    if (!location_uuid) throw badRequest('Введите location_uuid');
    const uri = await getSsdUriByCons_UID(cons_UID);
    if (!uri) {
        throw notFound('Отсутствуют источники данных.');
    }
    const [result, equipmentValues] = await Promise.all([
        qMeasuringEquipmentInfoOne(cons_UID, location_uuid, uri, st_date, end_date),
        qMeasuringEquipmentValuesAll(cons_UID, uri)
    ]);

    if (!equipmentValues) throw notFound(ERRORS.RESOURCE_NOT_FOUND);
    if (!result) throw notFound(ERRORS.RESOURCE_NOT_FOUND);

    const valuesObjectByEquipmentId = {};
    for (const eq of equipmentValues) {
        valuesObjectByEquipmentId[eq.equipment_uid] = eq.Values.sort((a, b) => {
            if (moment(a.Dt_value).diff(b.Dt_value, 'minutes') > 0) return 1;
            return 0;
        });
    }

    if (result.Mets) for (const met of result.Mets) {
        if (met.equipments) for (const equipment of met.equipments) {
            if (valuesObjectByEquipmentId[equipment.equipment_uid]) {
                equipment.Values = valuesObjectByEquipmentId[equipment.equipment_uid][0];
            } else equipment.Values = [];
        }
        if (met.equipmens) for (const equipment of met.equipmens) {
            if (valuesObjectByEquipmentId[equipment.equipment_uid]) {
                equipment.Values = valuesObjectByEquipmentId[equipment.equipment_uid][0];
            } else equipment.Values = [];
        }
        if (equipment_type || work) {
            if (met.equipmens) met.equipmens = equipmentsFilter(met.equipmens, equipment_type, work);
            if (met.equipments) met.equipments = equipmentsFilter(met.equipments, equipment_type, work);
        }
    }

    
    return result;
};