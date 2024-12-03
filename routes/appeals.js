const {Router} = require('express');
const router = Router();
const {checkCuratorOrUser, checkCurator, checkAnyThingWithoutError} = require('../libs/jwt');
const Document = require('../controllers/DocumentController');

router.get('/emails', async (_req, res, next) => {
    try {
        const result = await Document.getAdminEmails();
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/', checkCuratorOrUser, async (req, res, next) => {
    try {
        const {page = 1, limit = 20, draft, type, state, direction, contr_num, states, deleted, search} = req.query;
        const result = await Document.appealList(req.subLogin, req.curator || req.admin, page, limit, type, draft, direction, state, contr_num, states, deleted === 'true' ? true : false, search);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.post('/by_user', checkAnyThingWithoutError, async (req, res, next) => {
    try {
        const {type, contr_num, title, description, fileNames, appealId, draft, appealCuratorName, send_mail_option, cons_UID, blockThemeId, subLoginEmail, subLoginName, subLoginPhone, subLoginPosition, cons_inn, cons_kpp, cons_name, tp, adminEmail, contr_UID} = req.body;
        const result = await Document.createAppealBySubLogin({subLogin: req.subLogin, admin: req.admin, curator: req.curator, appealId, contr_num, title, description, fileNames, type, draft, appealCuratorName, send_mail_option, cons_UID, blockThemeId, subLoginEmail, subLoginName, subLoginPhone, subLoginPosition, cons_inn, cons_kpp, cons_name, tp, adminEmail, contr_UID});
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.post('/by_curator', checkCurator, async (req, res, next) => {
    try {
        const {type, title, description, fileNames, appealId, draft, contr_num} = req.body;
        const result = await Document.createAppealByCurator(req.curator || req.admin, appealId, title, description, draft, fileNames, type, contr_num);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.delete('/:id/draft', checkCuratorOrUser, async (req, res, next) => {
    try {
        const result = await Document.deleteDraftAppeal(req.subLogin, req.curator || req.admin, req.params.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/:id', checkCuratorOrUser, async (req, res, next) => {
    try {
        const result = await Document.getAppealById(req.subLogin, req.curator || req.admin, req.params.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

module.exports = router;