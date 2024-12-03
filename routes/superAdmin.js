const {Router} = require('express');
const router = Router();
const SuperAdmin = require('../controllers/SuperAdmin');
const {checkLKAdmin, checkSuperAdmin} = require('../libs/jwt');

router.post('/login', async (req, res, next) => {
    try {
        const {login, password} = req.body;
        const result = await SuperAdmin.login(login, password);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.post('/ssd_url', checkSuperAdmin, async (req, res, next) => {
    try {
        const {uri, email, title, regionId} = req.body;
        const result = await SuperAdmin.ssdUrlCreate(uri, email, title, regionId);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/ssd_url', checkSuperAdmin, async (req, res, next) => {
    try {
        const {regionId} = req.query;
        const result = await SuperAdmin.getSsdUrls(regionId);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.put('/ssd_url/:id', checkSuperAdmin, async (req, res, next) => {
    try {
        const {uri, email, title, regionId} = req.body;
        const result = await SuperAdmin.updateSsdUri(req.params.id, uri, email, title, regionId);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.delete('/ssd_url/:id', checkSuperAdmin, async (req, res, next) => {
    try {
        const result = await SuperAdmin.deleteSsdUri(req.params.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
