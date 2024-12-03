const express = require('express');
const router = express.Router();
const {checkUser} = require('../libs/jwt');
const Order = require('../controllers/Order');

router.post('/', checkUser(), async (req, res, next) => {
    try {
        const body = req.body;
        const {regionId} = req.authData;
        body.regionId = regionId;

        const result = await Order.createOrder(req.subLogin, body);

        res.send(result);
    } catch (err) {
        next(err);
    }
});

// router.post('/:id/document', checkUser(), async (req, res, next) => {
//     try {
//         const result = await Order.sendOrder(req.subLogin, req.params.id);
//         res.send(result);
//     } catch (err) {
//         next(err);
//     }
// });

router.get('/', checkUser(), async (req, res, next) => {
    try {
        const result = await Order.getOrdersOfUser(req.subLogin);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/:id', checkUser(), async (req, res, next) => {
    try {
        const result = await Order.getInfoAboutOrder(req.subLogin, {_id: req.params.id});
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/:id/status', checkUser(), async (req, res, next) => {
    try {
        const result = await Order.getOrderStatus(req.subLogin, {_id: req.params.id});
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/order_schedules', checkUser(), async (req, res, next) => {
    try {
        const result = await Order.getOrderSchedules(req.subLogin);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/order_schedules/:id', checkUser(), async (req, res, next) => {
    try {
        const result = await Order.getOrderScheduleById(req.subLogin, req.params.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.post('/order_schedules', checkUser(), async (req, res, next) => {
    try {
        const result = await Order.createOrderSchedule(req.subLogin, req.body);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.put('/order_schedules/:id', checkUser(), async (req, res, next) => {
    try {
        const result = await Order.updateOrderScheduleById(req.subLogin, req.params.id, req.body);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.delete('/order_schedules/:id', checkUser(), async (req, res, next) => {
    try {
        const result = await Order.deleteOrderSchedule(req.subLogin, req.params.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

module.exports = router;