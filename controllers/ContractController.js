const qPromConsumerContractList = require('../requests/qPromConsumerContractList');
const qPromConsumerContractInfo = require('../requests/qPromConsumerContractInfo');
const qPromContractFactSum = require('../requests/qPromContractFactSum');
const qPromContractBalance = require('../requests/qPromContractBalance');
const qPromContractPayment = require('../requests/qPromContractPayment');
const qPromContractPlanSum = require('../requests/qPromContractPlanSum');
const qReportGasConsumption = require('../requests/qReportGasConsumption');
const qReportPaymentVolume = require('../requests/qReportPaymentVolume');
const qReportPlanFactGasConsumption = require('../requests/qReportPlanFactGasConsumption');
const qPromSettlement = require('../requests/qPromSettlement');
const qPromContractDocInfo = require('../requests/qPromContractDocInfo');
const qMeasuringEquipmentInfoAll = require('../requests/qMeasuringEquipmentInfoAll');
const qReportGasPaymentStructure = require('../requests/qReportGasPaymentStructure');
const qReportFactGasPrice = require('../requests/qReportFactGasPrice');
const qReportGasSumComparison = require('../requests/qReportGasSumComparison');
const qReportPlanFactGasPrice = require('../requests/qReportPlanFactGasPrice');
const qPromContractPlanGasVolume = require('../requests/qPromContractPlanGasVolume');
const {getSsdUriByCons_UID, getSsdUriByConsumer} = require('../libs/getSsdUriByConsumer');
const ERRORS = require('../libs/errors');
const intersection = require('../libs/intersectionArray');
const moment = require('moment');
const {MetsVolume} = require('../models');
const sliceDate = require('../libs/sliceDate');

const {badImplementation, notFound, badRequest} = require('boom');
const Consumer = require('../models/Consumer');
const findAllContractsByLocationUuid = require('../requests/findAllContractsByLocationUuid');
const qPromContractScanDoc = require('../requests/qPromContractScanDoc');


exports.listByLocation = async (location_uuid, subLogin) => {
    const {ssd_uri} = subLogin;
    const result = await findAllContractsByLocationUuid(location_uuid, ssd_uri);
    return result;
};

exports.qReportGasPaymentStructure = async (subLogin, contr_UID, st_date1, end_date1, st_date2, end_date2, data_group, cons_point_uid) => {
    const {cons_UID, ssd_uri} = subLogin;
    const result = await qReportGasPaymentStructure(cons_UID, contr_UID, st_date1, end_date1, st_date2, end_date2, ssd_uri, data_group, cons_point_uid);
    return result;
};

exports.qReportPlanFactGasPrice = async (subLogin, contr_UID, st_date, end_date, data_group = 0, cons_point_uid) => {
    const {cons_UID, ssd_uri} = subLogin;
    const result = await qReportPlanFactGasPrice(cons_UID, contr_UID, st_date, end_date, data_group, ssd_uri, cons_point_uid);
    return result;
};

exports.qReportGasSumComparison = async (subLogin, contr_UID, st_date, end_date, data_group = 0) => {
    const {cons_UID, ssd_uri} = subLogin;
    st_date = sliceDate(st_date);
    end_date = sliceDate(end_date);
    const result = await qReportGasSumComparison(cons_UID, contr_UID, st_date, end_date, data_group, ssd_uri);
    return result;
};

exports.qReportFactGasPrice = async (subLogin, contr_UID, st_date1, end_date1, st_date2, end_date2, data_group = 0, cons_point_uid) => {
    const {cons_UID, ssd_uri} = subLogin;
    const result = await qReportFactGasPrice(cons_UID, contr_UID, st_date1, end_date1, st_date2, end_date2, data_group, ssd_uri, cons_point_uid);
    return result; 
};

const contractsFilter = (subLogin, contracts, type, admin = false) => {
    if ((subLogin && (subLogin.type === 'admin' || subLogin.type === 'curator')) || admin) return contracts;
    return intersection[type](subLogin.contracts || [], contracts || []);
};

exports.listForAdmin = async (cons_UIDs, contr_status) => {
    const contracts = [];
    for (const cons_UID of cons_UIDs) {
        const consumer = await Consumer.findOne({cons_UID}, {ssdUri: 1}).populate('ssdUri');
        if (!consumer) continue;
        const res = await qPromConsumerContractList(cons_UID, contr_status, getSsdUriByConsumer(consumer));
        contracts.push(...res);
    }
    return {contracts};
};

exports.list = async (subLogin, query = {}, admin) => {
    if (admin && !query.cons_UID) throw badRequest('Вставьте cons_UID в query');
    const {cons_UID, ssd_uri} = subLogin;
    if (!cons_UID) throw notFound('Consumer not found');
    const {contr_status = null} = query;
    return qPromConsumerContractList(admin ? query.cons_UID : cons_UID, contr_status, ssd_uri)
        .then(contracts => {
            if (contracts.error) throw badImplementation('Ошибка сервера');
            return contractsFilter(subLogin, contracts, 'intersectionContractsListAndContrUIDs', admin);
        });
};

exports.qPromSettlement = async (subLogin, query) => {
    const {cons_UID, ssd_uri} = subLogin;
    const {st_date = new Date(0), end_date = new Date()} = query;
    return qPromSettlement(cons_UID, st_date, end_date, ssd_uri)
        .then(result => {
            return contractsFilter(subLogin, result, 'intersectionContractsListAndContrUIDs');
        });
};

exports.qPromContractPayment = async (subLogin, query) => {
    const {cons_UID, ssd_uri} = subLogin;
    const {contr_UIDs = [], st_date = new Date(0), end_date = new Date()} = query;
    const result = [];
    const subLoginContracts = contractsFilter(subLogin, contr_UIDs, 'intersectionEasy');
    for (const contr_UID of subLoginContracts) {
        const res = await qPromContractPayment({contr_UID, st_date, end_date, cons_UID}, ssd_uri);
        result.push(...res);
    }
    return result;
};

exports.qPromContractFactSum = async (subLogin, query) => {
    const {ssd_uri} = subLogin;
    const {contr_UIDs = [], st_date = new Date(0), end_date = new Date()} = query;
    const result = [];
    const subLoginContracts = contractsFilter(subLogin, contr_UIDs, 'intersectionEasy');
    for (const contr_UID of subLoginContracts) {
        const res = await qPromContractFactSum({contr_UID, st_date, end_date}, ssd_uri);
        result.push(...res);
    }
    return result;
};

exports.qPromContractPlanGasVolume = async (subLogin, contr_UID) => {
    const {cons_UID} = subLogin;
    const uri = await getSsdUriByCons_UID(cons_UID);
    const result = await qPromContractPlanGasVolume(contr_UID, cons_UID, uri);
    return result;
};

exports.getContractByContrNum = async (subLogin, contr_num) => {
    const {cons_UID} = subLogin;
    const uri = await getSsdUriByCons_UID(cons_UID);
    const contracts = await qPromConsumerContractList(cons_UID, null, uri);
    for (const contract of contracts) {
        if (contract.contr_num === contr_num) return contract;
    }
    throw notFound('Договор с таким номером не найден', contr_num);
};

exports.getById = async (subLogin, contr_UID) => {
    const {cons_UID} = subLogin;
    if (subLogin.type !== 'admin' && subLogin.type !== 'curator' && (!subLogin.contracts || !subLogin.contracts.includes(contr_UID))) throw notFound('Contract not found');
    const uri = await getSsdUriByCons_UID(cons_UID);
    if (!uri) {
        throw notFound('Отсутствуют источники данных.');
    }
    return Promise.all([
        qPromConsumerContractInfo(contr_UID, uri),
        qMeasuringEquipmentInfoAll(subLogin.cons_UID, uri)
    ])
        .then(async ([contract, equipmentInfoAll]) => {
            if (!contract) throw notFound('Договор не найден');
            if (!equipmentInfoAll) throw notFound(ERRORS.RESOURCE_NOT_FOUND);
            const equipmentInfoObject = {};
            for (const loc of equipmentInfoAll) {
                if (loc.location_uid) {
                    delete loc.Mets;
                    equipmentInfoObject[loc.location_uid] = loc;
                }
            }
            if (contract.locations) 
                for (const loc of contract.locations) {
                    if (equipmentInfoObject[loc.location_uid]) 
                        loc.condition = equipmentInfoObject[loc.location_uid].condition;
                }
            return contract;
        });
};

exports.getByIdBalanceContract = async (subLogin, query) => {
    const {cons_UID} = subLogin;
    const {contr_UIDs = [], st_date = new Date(0), end_date = new Date()} = query;
    const result = [];
    const subLoginContracts = contractsFilter(subLogin, contr_UIDs, 'intersectionEasy');
    for (const contr_UID of subLoginContracts) {
        const uri = await getSsdUriByCons_UID(cons_UID);
        const res = await qPromContractBalance({contr_UID, cons_UID, st_date, end_date}, uri);
        const contract = await qPromConsumerContractInfo(contr_UID, uri);
        result.push(...(res.map(i => {i.contr_UID = contr_UID; i.contr_num = contract ? contract.contr_num : '-'; return i;})));
    }
    return result;
};

exports.qPromContractPlanSum = async (subLogin, query) => {
    const {ssd_uri} = subLogin;
    const {contr_UIDs = [], st_date = new Date(0), end_date = new Date()} = query;
    const result = [];
    const intersectionContracts = contractsFilter(subLogin, contr_UIDs, 'intersectionEasy');
    await Promise.all(intersectionContracts.map(async contr_UID => {
        result.push(...(await qPromContractPlanSum({contr_UID, st_date, end_date}), ssd_uri));
    }));
    return result;
};

exports.qReportGasConsumption = async (subLogin, contr_UID, location_UID, st_date1, end_date1, st_date2, end_date2, data_group = 0, cons_point_uid) => {
    const {cons_UID} = subLogin;
    st_date1 = st_date1 ? moment(st_date1).toISOString().slice(0, 19) : '2019-01-01T00:00:00';
    st_date2 = st_date2 ? moment(st_date2).toISOString().slice(0, 19) : '2018-01-01T00:00:00';
    end_date1 = end_date1 ? moment(end_date1).toISOString().slice(0, 19) : '2019-12-31T00:00:00';
    end_date2 = end_date2 ? moment(end_date2).toISOString().slice(0, 19) : '2018-12-31T00:00:00';
    const uri = await getSsdUriByCons_UID(cons_UID);
    const result = await qReportGasConsumption(cons_UID, contr_UID, location_UID, st_date1, end_date1, st_date2, end_date2, parseInt(data_group), uri, cons_point_uid);
    if (!result) throw notFound('Resource not found');
    return result;
};

exports.qReportPaymentVolume = async (subLogin, contr_UID, st_date1, end_date1, st_date2, end_date2, data_group = 0, cons_point_uid) => {
    const {cons_UID} = subLogin;
    st_date1 = st_date1 ? moment(st_date1).toISOString().slice(0, 19) : '2019-01-01T00:00:00';
    st_date2 = st_date2 ? moment(st_date2).toISOString().slice(0, 19) : '2018-01-01T00:00:00';
    end_date1 = end_date1 ? moment(end_date1).toISOString().slice(0, 19) : '2019-12-31T00:00:00';
    end_date2 = end_date2 ? moment(end_date2).toISOString().slice(0, 19) : '2018-12-31T00:00:00';
    const uri = await getSsdUriByCons_UID(cons_UID);
    const result = await qReportPaymentVolume(cons_UID, contr_UID, st_date1, end_date1, st_date2, end_date2, parseInt(data_group), cons_point_uid, uri);
    if (!result) throw notFound('Resource not found');
    return result;
};

exports.qReportPlanFactGasConsumption = async (subLogin, contr_UID, cons_point_uid, st_date, end_date, data_group = 0) => {
    const {cons_UID} = subLogin;
    st_date = st_date && moment(st_date) ? moment(st_date).toISOString().slice(0, 19) : '2019-01-01T00:00:00';
    end_date = end_date && moment(st_date) ? moment(end_date).toISOString().slice(0, 19) : '2019-12-31T00:00:00';
    const uri = await getSsdUriByCons_UID(cons_UID);
    const result = await qReportPlanFactGasConsumption(cons_UID, contr_UID, cons_point_uid, st_date, end_date, parseInt(data_group), uri);
    if (!result) throw notFound('Resource not found');
    return result;
};

exports.qPromContractDocInfo = async (user, contr_UID, st_date, end_date) => {
    const result = await qPromContractDocInfo(contr_UID, st_date, end_date, user.ssd_uri);
    return result;
};

exports.qPromContractScanDoc = async (doc_uid, doc_type, cons_UID) => {
    const ssdUri = await getSsdUriByCons_UID(cons_UID);
    const result = await qPromContractScanDoc(doc_uid, doc_type, ssdUri);
    return result;
};

exports.metsVolumeCreate = async (subLogin, values, contr_UID) => {
    for (const value of values) {
        if (value.date && moment(moment().startOf('month')).diff(value.date, 'seconds') > 0) throw badRequest('Нельзя вводить показания за прошедший месяц'); 
        value.cons_UID = subLogin.cons_UID;
        value.user = subLogin.user;
        value.contr_UID = contr_UID;
    }
    await MetsVolume.insertMany(values);
    return {message: 'ok'};
};

exports.getListMetsVolumes = async (subLogin, contr_UID, from, to) => {
    const query = {user: subLogin.user._id, cons_UID: subLogin.cons_UID};
    if (contr_UID) query.contr_UID = contr_UID;
    if (from || to) {
        query.date = {$gte: from ? new Date(from) : new Date(0), $lte: to ? new Date(to) : new Date()};
    }
    const metsVolumes = await MetsVolume.find(query);
    return {metsVolumes};
};

exports.updateMetsVolumes = async (subLogin, _id, date, factVolume, planVolume, contr_UID) => {
    const metsVolume = await MetsVolume.findOne({_id, user: subLogin.user._id, cons_UID: subLogin.cons_UID});
    if (!metsVolume) throw notFound('Mets volume not found');
    if (date) {
        if (moment(moment().startOf('month')).diff(date, 'seconds') > 0) throw badRequest('Нельзя вводить показания за прошедший месяц'); 
        metsVolume.date = date;
    }
    if (factVolume || factVolume === 0) metsVolume.factVolume = factVolume;
    if (planVolume || planVolume === 0) metsVolume.planVolume = planVolume;
    if (contr_UID) metsVolume.contr_UID = contr_UID;
    await metsVolume.save();
    return {message: 'ok'};
};

exports.deleteMetsVolume = async (subLogin, _id) => {
    const metsVolume = await MetsVolume.findOne({_id, user: subLogin.user._id, cons_UID: subLogin.cons_UID});
    if (!metsVolume) throw notFound('Mets volume not found');
    await MetsVolume.deleteOne({_id});
    return {message: 'ok'};
};