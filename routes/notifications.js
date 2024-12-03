const {Router} = require('express');
const router = Router();
const Notification = require('../controllers/NotificationController');
const {checkUser} = require('../libs/jwt');
const {badRequest} = require('boom');

router.get('/', checkUser([]), async (req, res, next) => {
    try {
        const result = await Notification.getList(req.subLogin, req.query.cons_UID);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.put('/', checkUser([]), async (req, res, next) => {
    try {
        const {cons_UID} = req.query;
        if (!cons_UID) throw badRequest('Введите cons_UID');
        const {emails, phones, sendEmail, sendPhone} = req.body;
        const result = await Notification.update(req.subLogin, cons_UID, emails, phones, sendEmail, sendPhone);
        res.send(result);
    } catch (err) {
        next(err);
    }
});


module.exports = router;