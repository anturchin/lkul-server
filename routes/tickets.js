const express = require('express');
const router = express.Router();
const {checkUser} = require('../libs/jwt');
const TicketController = require('../controllers/Ticket');

router.post('/', checkUser('anon'), async (req, res, next) => {
    try {
        const result = await TicketController.createTicket(req.subLogin, req.body);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

module.exports = router;