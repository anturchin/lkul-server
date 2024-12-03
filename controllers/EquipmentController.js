const qsetEquipmentValues = require('../requests/qsetEquipmentValues');
const qMeasuringEquipmentValuesOne = require('../requests/qMeasuringEquipmentValuesOne');
const qPromEquipmentsConfirmation = require('../requests/qPromEquipmentsConfirmation');
const qGasEquipmentInfoAll = require('../requests/qGasEquipmentInfoAll');
const qMeasuringEquipmentInfoOne = require('../requests/qMeasuringEquipmentInfoOne');
const {badData, badRequest, notFound, conflict} = require('boom');
const xlsx = require('../libs/xlsx');
const Location = require('../controllers/LocationController');
const Contract = require('../controllers/ContractController');
const fs = require('fs');
const moment = require('moment');
const equipmentsFilter = require('../libs/equipmentFilter');
const ERRORS = require('../libs/errors');
const base64gen = require('../libs/base64gen');
const checkDate = require('../libs/checkDateForSetValues');
const {getSsdUriByCons_UID} = require('../libs/getSsdUriByConsumer');
const { getMetBlockingDate } = require('./MetController');
const qSetScanEquipmentValues = require('../requests/qSetScanEquipmentValues');
const qGetScanEquipmentValues = require('../requests/qGetScanEquipmentValues');
const qDelScanEquipmentValues = require('../requests/qDelScanEquipmentValues');

const equipment_date_values_func = async (subLogin, location_uuid, equipment_uuid, st_date, end_date) => {
    const equipment_date_values = {};
    const type_gas_list_result = await qMeasuringEquipmentInfoOne(subLogin.cons_UID, location_uuid, subLogin.ssd_uri, moment(st_date).startOf('day'), moment(end_date).endOf('day'));
    if (type_gas_list_result && type_gas_list_result.Mets) {
        for (const met of type_gas_list_result.Mets) {
            if (met.type_gas_list) {
                for (const list of met.type_gas_list) {
                    if (list.equipment_uid === equipment_uuid) {
                        equipment_date_values[moment(list.dt_value).startOf('day').toISOString()] = 1;
                    }
                }
            }
        }
    }
    return equipment_date_values;
};

const correctValue = (value) => {
    if (typeof value === 'string' && value.indexOf(',') !== -1) {
        value = value.replace(',', '.');
    }
    if (typeof value === 'string') {
        value = parseFloat(value);
    }
    return value;
};

exports.put = async (user, body) => {
    const {location_uuid, Met_uuid, values, contr_UID, equipment_uuid} = body;
    if (!location_uuid || !Met_uuid) throw badData('Заполните все поля');
    body.cons_UID = user.cons_UID;
    if (values && values[0]) {
        let prev = 0;
        for (const value of values) {
            value.Value = correctValue(value.Value);
            value.GasVolume = correctValue(value.GasVolume);
            if (value.Value) value.Value = Math.round(value.Value);
            if (value.GasVolume) value.GasVolume = Math.round(value.GasVolume);
            if (prev && value.Value < prev) throw conflict('Некорректные значение за ' + moment(value.Dt_value).format('YYYY-MM-DD'));
            prev = value.Value;
        }
        for (const value of values) {
            if ((!value.Value && value.Value !== 0 && value.GasVolume !== 0 && !value.GasVolume) || !value.Dt_value) throw badData('Заполните поля в массиве показаний');
            await getMetBlockingDate(values[0].Dt_value);
            const data = {
                cons_UID: body.cons_UID,
                location_uuid: body.location_uuid,
                Met_uuid: body.Met_uuid,
                Value: value.Value,
                equipment_uuid,
                Dt_value: value.Dt_value,
                Contr_uid: contr_UID,
                contr_UID,
                GasVolume: value.GasVolume,
                endday: value.endday || false
            };
            const uri = await getSsdUriByCons_UID(body.cons_UID);
            await qsetEquipmentValues(data, uri);
        }
    }
    return {message: 'OK'};
};

const valuesSortByDate = (values, st_date = moment().add(-1, 'month'), end_date = new Date(), valueType = 1) => {
    const valuesObject = {};
    let dates = [];
    for (const Value of values) {
        if (Value.endday) continue;
        const date = moment(Value.Dt_value).startOf('day').format('YYYY-MM-DD');
        // if (!dates.includes(date) && moment(moment(date).add(1, 'hours')).isBetween(moment(st_date).startOf('day'), moment(end_date).endOf('day'))) dates.push(date);
        valuesObject[date] = String(valueType) === '1' ? Value.Value : Value.GasVolume;
    }
    const resultDates = [];
    let lastDate = st_date;
    dates = dates.sort((a, b) => {
        return moment(a).diff(moment(b), 'days');
    });
    // if (lastDate && moment(lastDate).diff(moment(st_date).startOf('day'), 'days') > 0) {
    //     while (lastDate && moment(lastDate).diff(st_date, 'days') < 0) {
    //         lastDate = moment(lastDate).add(1, 'days').format('YYYY-MM-DD');
    //         valuesObject[lastDate] = '';
    //         resultDates.push(lastDate);
    //     }
    // }
    if ((lastDate && dates[0] && moment(lastDate).diff(dates[0], 'days') < 0) || !dates.length) resultDates.push(moment(lastDate).format('YYYY-MM-DD'));
    for (const d of dates) {
        while (lastDate && moment(lastDate).diff(d, 'days') < -1) {
            lastDate = moment(lastDate).add(1, 'days').format('YYYY-MM-DD');
            if (!valuesObject[lastDate]) valuesObject[lastDate] = '';
            resultDates.push(lastDate);
        }
        resultDates.push(d);
        lastDate = d;
    }
    if (lastDate && moment(lastDate).diff(moment(end_date).startOf('day'), 'days') < 0) {
        while (lastDate && moment(lastDate).diff(end_date, 'days') < 0) {
            lastDate = moment(lastDate).add(1, 'days').format('YYYY-MM-DD');
            if (!valuesObject[lastDate]) valuesObject[lastDate] = '';
            resultDates.push(lastDate);
        }
    }
    return {
        dates: resultDates,
        values: valuesObject
    };
};  

exports.xlsxImport = async (subLogin, fileName, valueType = 1, contr_UID, location_uuid, Met_uid, equipment_uuid) => {
    if (!contr_UID) throw badRequest('Enter contr_UID');
    if (!location_uuid) throw badRequest('Enter location_uuid');
    if (!Met_uid) throw badRequest('Enter Met_uid');
    if (!equipment_uuid) throw badRequest('Enter equipment_uuid');
    const fileType = fileName.split('.').pop();
    if (fileType !== 'xlsx') throw badRequest('Неверный формат реестра');
    const [data] = await Promise.all([
        xlsx.parse(fileName),
    ]);
    let st_date, end_date;
    const result = await Promise.all(data.map(async item => {
        for (const value of item.Values) {
            if (!st_date) st_date = moment(value.Dt_value).startOf('day').toISOString();
            if (moment(st_date).diff(value.Dt_value, 'seconds') > 0) st_date = moment(value.Dt_value).startOf('day').toISOString();

            if (!end_date) end_date = moment(value.Dt_value).startOf('day').toISOString();
            if (moment(end_date).diff(value.Dt_value, 'seconds') < 0) end_date = moment(value.Dt_value).startOf('day').toISOString();
        }
        item.contr_UID = contr_UID;
        item.location_uuid = location_uuid;
        item.Met_uuid = Met_uid;
        item.equipment_uuid = equipment_uuid;
        return item;
    }));
    const equipment_date_values = await equipment_date_values_func(subLogin, location_uuid, equipment_uuid, st_date, end_date);
    for (const item of result) {
        console.log(item);
        await exports.put(subLogin, {
            location_uuid: item.location_uuid, 
            Met_uuid: item.Met_uuid,
            equipment_uuid: item.equipment_uuid,
            values: item.Values.filter(v => {
                v.Dt_value = moment(v.Dt_value).startOf('day');
                if (v.Value && checkDate(v.Dt_value, equipment_date_values)) return 1;
                return 0;
            }).map(v => {
                return {
                    Dt_value: v.Dt_value,
                    Value: String(valueType) === '1' ? v.Value : 0,
                    GasVolume: String(valueType) === '1' ? 0 : v.Value
                };
            }),
            contr_UID: item.contr_UID
        });
    }
    
    return {message: 'OK'};
};

exports.xlsxExport = async (subLogin, contr_UID, location_uuid, Met_uid, st_date, end_date, valueType = 1, equipment_uuid) => {
    if (!contr_UID) throw badRequest('Enter contr_UID');
    if (!location_uuid) throw badRequest('Enter location_uuid');
    if (!Met_uid) throw badRequest('Enter Met_uid');
    if (!equipment_uuid) throw badRequest('Enter equipment_uuid');
    const [metsValues, location, contract] = await Promise.all([
        exports.getValuesByEquipment(subLogin, Met_uid, valueType, st_date, end_date),
        Location.metsByLocationUID(subLogin, location_uuid),
        Contract.getById(subLogin, contr_UID)
    ]);
    let Equipment = null; 
    for (const met of location.Mets) {
        Equipment = met.equipmens.filter(e => e.equipment_uid === equipment_uuid)[0];
        if (Equipment) break;
    }
    if (!contract) throw notFound('Contract not found');
    if (!location) throw notFound('Location not found');
    if (!location.Mets) throw notFound('Mets not found');
    const met = location.Mets.filter(m => {
        if (m.Met_uid === Met_uid) return true;
        return false;
    })[0];
    if (!met) throw notFound('Met not found');

    
    const contr_num = contract.contr_num;
    const Location_Name = location.Location_Name;
    const Met_name = met ? met.Met_name : '-';
    let Values = [];
    const equipment_date_values = await equipment_date_values_func(subLogin, location_uuid, equipment_uuid, st_date, end_date);
    if (met.daily) {
        const datesAndValues = valuesSortByDate(metsValues.Values, st_date, end_date, valueType);
        
        Values = datesAndValues.dates.map(d => {
            return {Dt_value: d, Value: equipment_date_values[moment(d).startOf('day').toISOString()] ? (datesAndValues.values[d] || 0) : 0};
        });
    } else {
        const months = {};
        for (const value of metsValues.Values) {
            if (value.endday) continue;
            let {Dt_value: d, Value, GasVolume} = value;
            if (String(valueType) === '2') Value = GasVolume;
            if (!months[moment(d).startOf('month')]) {
                if (!equipment_date_values[moment(d).startOf('day').toISOString()]) Value = 0;
                months[moment(d).startOf('month')] = {Dt_value: d, Value}; 
            }
            else {
                if (moment(months[moment(d).startOf('month')].Dt_value).diff(d, 'seconds') > 0) {
                    months[moment(d).startOf('month')].Value = months[moment(d).startOf('month')].Value - Value;
                } else months[moment(d).startOf('month')].Value = Value - months[moment(d).startOf('month')].Value;
                months[moment(d).startOf('month')].Dt_value = moment(d).startOf('month').format('YYYY-MM-DD');
            }
        }
        for (const key in months) {
            Values.push(months[key]);
        }
    }
    const result = [];
    result.push({contr_num, Location_Name, Met_name, Values, Equipment_name: Equipment.Equipment_name, serial_number: Equipment.serial_number});
    const buffer = await xlsx.exportXlsx(result, valueType);
    const fileName = `${String(valueType) === '1' ? 'показания' : 'расход'}_${moment(st_date).format('YYYY-MM-DD')}-${moment(end_date).format('YYYY-MM-DD')}-${Date.now()}.xlsx`;
    await fs.writeFileSync(`${__dirname}/../public/${fileName}`, buffer);
    return {fileName};
};

exports.confirmByFile = async (subLogin, location_uuid, Met_uuid, fileName) => {
    const {cons_UID,ssd_uri} = subLogin;
    const base64 = base64gen(fileName);
    await qPromEquipmentsConfirmation(cons_UID, location_uuid, Met_uuid, base64, ssd_uri);
    return {message: 'ok'};
};

exports.getValuesByEquipment = async (subLogin, met_uuid, _valueType = 1, dateFrom, dateTo) => {
    const {cons_UID} = subLogin;
    const result = await qMeasuringEquipmentValuesOne(cons_UID, met_uuid, subLogin.ssd_uri, dateFrom, dateTo);
    if (!result) throw notFound(ERRORS.RESOURCE_NOT_FOUND);
    return result;
};

exports.qGasEquipmentInfoAll = async (subLogin, location_uuids = [], equipment_type = null, work = null) => {
    const {cons_UID} = subLogin;
    if (!cons_UID) throw badRequest('Cons_UID not found');
    const uri = await getSsdUriByCons_UID(cons_UID);
    if (!uri) {
        throw conflict('Отсутствуют источники данных.');
    }
    const result = await qGasEquipmentInfoAll(cons_UID, uri);
    if (equipment_type || work)
        for (const r of result) {
            r.equipmens = equipmentsFilter(r.equipmens, equipment_type, work);
        }
    if (location_uuids && location_uuids[0]) {
        const search = [];
        for (const r of result) {
            if (location_uuids.includes((r.location_uid))) {
                search.push(r);
            }
        }
        return search;
    }
    if (!result) throw notFound('Info not found');
    return result;
};

exports.qSetScanEquipmentValues = async (subLogin, cons_point_uid, Met_uid, dt_value, name_scan, fileName) => {
    const {cons_UID} = subLogin;
    const uri = await getSsdUriByCons_UID(cons_UID);
    const data = {
        cons_uid: cons_UID,
        cons_point_uid,
        Met_uid,
        dt_value,
        name_scan,
    };
    const content = base64gen(fileName);
    data.content = content;
    const result = await qSetScanEquipmentValues(data, uri);
    return {result};
};

exports.qGetScanEquipmentValues = async (subLogin, file_id) => {
    const {cons_UID} = subLogin;
    const uri = await getSsdUriByCons_UID(cons_UID);
    const result = await qGetScanEquipmentValues(file_id, uri);
    return {result};
};

exports.qDelScanEquipmentValues = async (subLogin, file_id) => {
    const {cons_UID} = subLogin;
    const uri = await getSsdUriByCons_UID(cons_UID);
    const result = await qDelScanEquipmentValues(file_id, uri);
    return {result};
};

