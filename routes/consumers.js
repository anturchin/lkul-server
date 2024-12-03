const {Router} = require('express');
const router = Router();
const {checkCuratorOrUser} = require('../libs/jwt');
const Consumer = require('../controllers/ConsumerController');

router.get('/payments', checkCuratorOrUser, async (req, res, next) => {
    try {
        const {st_date = new Date(0), end_date = new Date()} = req.query;
        const result = await Consumer.qPromConsumerPayment(req.subLogin || req.curator || req.admin, st_date, end_date);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/unknown_payments', checkCuratorOrUser, async (req, res, next) => {
    try {
        const {st_date = new Date(0), end_date = new Date()} = req.query;
        const result = await Consumer.qPromUnknownPayment(req.subLogin || req.curator || req.admin, st_date, end_date);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

module.exports = router;