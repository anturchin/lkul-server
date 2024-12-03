const router = require('express').Router();
const {checkLKAdminOrSuperAdmin} = require('../libs/jwt');
const Tab = require('../controllers/TabController');

router.get('/', checkLKAdminOrSuperAdmin, async (_req, res, next) => {
    try {
        const result = await Tab.getTabs();
        res.send(result);
    } catch (err) {
        next(err);
    }
});


module.exports = router;
