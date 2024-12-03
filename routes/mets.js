const {Router} = require('express');
const router = Router();
const Met = require('../controllers/').MetController;
const {checkLKAdminOrSuperAdmin, checkLKAdminOrCuratorOrUserOrSuperUser} = require('../libs/jwt');

router.put('/blocking', checkLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const result = await Met.updateMetBlocking(req.body);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/blocking', checkLKAdminOrCuratorOrUserOrSuperUser, async (req, res, next) => {
    try {
        const result = await Met.getMetBlockings(req.query);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

module.exports = router;