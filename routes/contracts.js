const {Router} = require('express');
const router = Router();
const {checkUser, checkCuratorOrUser} = require('../libs/jwt');
const Contract = require('../controllers/ContractController');

router.get('/', checkCuratorOrUser, async (req, res, next) => {
    try {
        let result = null;
        const {cons_UIDs, contr_status} = req.query;
        if (req.subLogin && req.subLogin.type === 'admin' && cons_UIDs) {
            result = (await Contract.listForAdmin(cons_UIDs, contr_status)).contracts;
        } else {
            result = await Contract.list(req.subLogin || req.curator || req.admin, req.query, req.admin);
        }
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/by_location/:location_uuid', checkCuratorOrUser, async (req, res, next) => {
    try {
        const result = await Contract.listByLocation(req.params.location_uuid, req.subLogin || req.curator || req.admin);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/balance', checkCuratorOrUser, (req, res, next) => {
    Contract.getByIdBalanceContract(req.subLogin || req.curator || req.admin, req.query)
        .then(result => res.send(result))
        .catch(err => next(err));
});

router.get('/settlement', checkCuratorOrUser, (req, res, next) => {
    Contract.qPromSettlement(req.subLogin || req.curator || req.admin, req.query)
        .then(result => res.send(result))
        .catch(err => next(err));
});

router.get('/fact', checkCuratorOrUser, (req, res, next) => {
    Contract.qPromContractFactSum(req.subLogin || req.curator || req.admin, req.query)
        .then(result => res.send(result))
        .catch(err => next(err));
});

router.get('/plan', checkCuratorOrUser, (req, res, next) => {
    Contract.qPromContractPlanSum(req.subLogin || req.curator || req.admin, req.query)
        .then(result => res.send(result))
        .catch(err => next(err));
});

router.get('/payments', checkCuratorOrUser, (req, res, next) => {
    Contract.qPromContractPayment(req.subLogin || req.curator || req.admin, req.query)
        .then(result => res.send(result))
        .catch(err => next(err));
});

router.post('/mets_volumes', checkUser([]), async (req, res, next) => {
    try {
        const {values, contr_UID} = req.body;
        const result = await Contract.metsVolumeCreate(req.subLogin, values, contr_UID);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/mets_volumes', checkUser([]), async (req, res, next) => {
    try {
        const {contr_UID, from, to} = req.query;
        const result = await Contract.getListMetsVolumes(req.subLogin, contr_UID, from, to);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.put('/mets_volumes/:id', checkUser([]), async (req, res, next) => {
    try {
        const {date, factVolume, planVolume, contr_UID} = req.body;
        const result = await Contract.updateMetsVolumes(req.subLogin, req.params.id, date, factVolume, planVolume, contr_UID);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.delete('/mets_volumes/:id', checkUser([]), async (req, res, next) => {
    try {
        const result = await Contract.deleteMetsVolume(req.subLogin, req.params.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/:id/qReportFactGasPrice', checkCuratorOrUser, async (req, res, next) => {
    try {
        const {st_date1, st_date2, end_date1, end_date2, data_group, cons_point_uid} = req.query;
        const result = await Contract.qReportFactGasPrice(req.subLogin || req.curator || req.admin, req.params.id, st_date1, end_date1, st_date2, end_date2, data_group, cons_point_uid);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/:id/qPromContractPlanGasVolume', checkCuratorOrUser, async (req, res, next) => {
    try {
        const result = await Contract.qPromContractPlanGasVolume(req.subLogin || req.curator || req.admin, req.params.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/:id/qReportGasSumComparison', checkCuratorOrUser, async (req, res, next) => {
    try {
        const {st_date, end_date, data_group} = req.query;
        const result = await Contract.qReportGasSumComparison(req.subLogin || req.curator || req.admin, req.params.id, st_date, end_date, data_group);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/:id/qReportGasPaymentStructure', checkCuratorOrUser, async (req, res, next) => {
    try {
        const {st_date1, st_date2, end_date1, end_date2, data_group, cons_point_uid} = req.query;
        const result = await Contract.qReportGasPaymentStructure(req.subLogin || req.curator || req.admin, req.params.id, st_date1, end_date1, st_date2, end_date2, data_group, cons_point_uid);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/:id/qReportPlanFactGasPrice', checkCuratorOrUser, async (req, res, next) => {
    try {
        const {st_date, end_date, data_group, cons_point_uid} = req.query;
        const result = await Contract.qReportPlanFactGasPrice(req.subLogin || req.curator || req.admin, req.params.id, st_date, end_date, data_group, cons_point_uid);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/:id', checkCuratorOrUser, (req, res, next) => {
    Contract.getById(req.subLogin || req.curator || req.admin, req.params.id)
        .then(result => res.send(result))
        .catch(err => next(err));
});

router.get('/:id/qReportGasConsumption', checkCuratorOrUser, async (req, res, next) => {
    try {
        const {location_UID, st_date1, st_date2, end_date1, end_date2, data_group, cons_point_uid} = req.query;
        const result = await Contract.qReportGasConsumption(req.subLogin || req.curator || req.admin, req.params.id, location_UID, st_date1, end_date1, st_date2, end_date2, data_group, cons_point_uid);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/:id/qReportPaymentVolume', checkCuratorOrUser, async (req, res, next) => {
    try {
        const {st_date1, st_date2, end_date1, end_date2, data_group, cons_point_uid} = req.query;
        const result = await Contract.qReportPaymentVolume(req.subLogin || req.curator || req.admin, req.params.id, st_date1, end_date1, st_date2, end_date2, data_group, cons_point_uid);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/:id/qReportPlanFactGasConsumption', checkCuratorOrUser, async (req, res, next) => {
    try {
        const {st_date, end_date, cons_point_uid, data_group} = req.query;
        const result = await Contract.qReportPlanFactGasConsumption(req.subLogin || req.curator || req.admin, req.params.id, cons_point_uid, st_date, end_date, data_group);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/:id/qPromContractDocInfo', checkCuratorOrUser, async (req, res, next) => {
    try {
        const {st_date, end_date} = req.query;
        const result = await Contract.qPromContractDocInfo(req.subLogin || req.curator, req.params.id, st_date, end_date);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/qPromContractDocInfo/:id', checkCuratorOrUser, async (req, res, next) => {
    try {
        const {doc_type} = req.query;
        const result = await Contract.qPromContractScanDoc(req.params.id, doc_type, req.cons_UID);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

module.exports = router;