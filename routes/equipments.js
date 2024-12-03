const {Router} = require('express');
const router = Router();
const Equipment = require('../controllers/EquipmentController');
const {checkCuratorOrUser} = require('../libs/jwt');
const {badRequest} = require('boom');

router.put('/confirm', checkCuratorOrUser, async (req, res, next) => {
    try {
        const {fileName, location_uuid, Met_uuid} = req.body;
        if (!location_uuid) throw badRequest('Absent location_uuid in body');
        if (!Met_uuid) throw badRequest('Absent Met_uuid in body');
        if (!fileName) throw badRequest('Absent fileName in body');
        const result = await Equipment.confirmByFile(req.subLogin || req.curator || req.admin, location_uuid, Met_uuid, fileName);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/qGetScanEquipmentValues', checkCuratorOrUser, async (req, res, next) => {
    try {
        const {file_id} = req.query;
        const result = await Equipment.qGetScanEquipmentValues(req.subLogin, file_id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.put('/qSetScanEquipmentValues', checkCuratorOrUser, async (req, res, next) => {
    try {
        const {location_uuid, met_uuid, dt_value, name, fileName} = req.body;
        const result = await Equipment.qSetScanEquipmentValues(req.subLogin, location_uuid, met_uuid, dt_value, name, fileName);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.delete('/qDelScanEquipmentValues', checkCuratorOrUser, async (req, res, next) => {
    try {
        const {file_id} = req.query;
        const result = await Equipment.qDelScanEquipmentValues(req.subLogin, file_id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.post('/import/:file', checkCuratorOrUser, async (req, res, next) => {
    try {
        const {valueType, contr_UID, location_uuid, Met_uid, equipment_uuid} = req.body;
        const result = await Equipment.xlsxImport(req.subLogin || req.curator || req.admin, req.params.file, valueType, contr_UID, location_uuid, Met_uid, equipment_uuid);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/export', checkCuratorOrUser, async (req, res, next) => {
    try {
        const {contr_UID, location_uuid, Met_uid, st_date, end_date, valueType, equipment_uuid} = req.query;
        const result = await Equipment.xlsxExport(req.subLogin || req.curator || req.admin, contr_UID, location_uuid, Met_uid, st_date, end_date, valueType, equipment_uuid);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.put('/:id', checkCuratorOrUser, (req, res, next) => {
    req.body.equipment_uuid = req.params.id;
    const {valueType = 1} = req.body;
    Equipment.put(req.subLogin || req.curator || req.admin, req.body, valueType)
        .then(result => res.send(result))
        .catch(err => next(err));
});

router.get('/:id/values', checkCuratorOrUser, async (req, res, next) => {
    try {
        const met_uuid = req.params.id;
        const {valueType = 1, dateFrom, dateTo} = req.query;
        const result = await Equipment.getValuesByEquipment(req.subLogin || req.curator || req.admin, met_uuid, valueType, dateFrom, dateTo);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/gas_equipment_info', checkCuratorOrUser, async (req, res, next) => {
    try {
        const {location_uuids, equipment_type, work} = req.query;
        const result = await Equipment.qGasEquipmentInfoAll(req.subLogin || req.curator || req.admin, location_uuids, equipment_type, work);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

module.exports = router;