const {Router} = require('express');
const router = Router();
const Location = require('../controllers/').LocationController;
const {checkUser, checkCuratorOrUser} = require('../libs/jwt');

router.get('/', checkCuratorOrUser, (req, res, next) => {
    Location.list(req.subLogin || req.curator || req.admin, req.query)
        .then(result => res.send(result))
        .catch(err => next(err));
});

router.get('/:id/mets', checkCuratorOrUser, async (req, res, next) => {
    try {
        const location_uuid = req.params.id;
        const {equipment_type, work, st_date, end_date} = req.query;
        const result = await Location.metsByLocationUID(req.subLogin || req.curator || req.admin, location_uuid, equipment_type, work, st_date, end_date);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/equipments.csv', checkUser([]), (req, res, next) => {
    Location.getCsv(req.subLogin, req.query)
        .then(result => res.send(result))
        .catch(err => next(err));
});

module.exports = router;