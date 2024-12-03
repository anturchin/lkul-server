const {Router} = require('express');
const router = Router();
const {checkLKAdminOrSuperAdmin} = require('../libs/jwt');
const { DocumentController } = require('../controllers');

router.get('/', async (req, res, next) => {
    try {
        const {from, to, page, limit, regionId} = req.query;
        const result = await DocumentController.getListOfNews(null, from, to, page, limit, regionId);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.post('/', checkLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const {title, body, content, regionId} = req.body;
        const result = await DocumentController.newsCreate(req.admin, title, body, content, regionId);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const result = await DocumentController.getNewsById(null, req.params.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.put('/:id', checkLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const {title, body, content, regionId} = req.body;
        const result = await DocumentController.updateNews(req.admin, req.params.id, title, body, content, regionId);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.delete('/:id', checkLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const result = await DocumentController.deleteNews(req.admin, req.params.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

module.exports = router;