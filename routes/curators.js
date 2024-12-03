const {Router} = require('express');
const router = Router();
const {checkCurator, checkLKAdminOrSuperAdmin, checkCuratorOrLKAdminOrSuperAdmin} = require('../libs/jwt');
const Curator = require('../controllers/Curator');
const User = require('../controllers/UserController');
const { unauthorized } = require('boom');

router.post('/', checkLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const {login, password, repeatPassword, position, email, phone, blocked, tabs, firstName, lastName, middleName, regionId} = req.body;
        const result = await Curator.createCurator(login, password, repeatPassword, position, email, phone, blocked, tabs, firstName, lastName, middleName, regionId);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/', checkLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const {position, sort, name, limit, page, email, regionId} = req.query;
        const result = await Curator.getListOfCurators(position, sort, name, limit, page, email, regionId);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.post('/login', async (req, res, next) => {
    try {
        const {login, password} = req.body;
        const result = await Curator.login(login, password);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/info', checkCurator, async (req, res, next) => {
    try {
        const result = await Curator.getCuratorInfo(req.curator);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/consumers', checkCuratorOrLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const {
          page,
          limit,
          cons_inn,
          cons_short_name,
          user_name,
          sortBy,
          desc,
          cons_UIDs,
          lkp,
          cons_kpp,
          regionId,
          isShowBroken = false
        } = req.query;
        const result = await Curator.getConsumersList(
          req.curator || { email: req.query.email },
          page,
          limit,
          cons_inn,
          cons_short_name,
          user_name,
          sortBy,
          desc === "true",
          cons_UIDs,
          lkp,
          cons_kpp,
          regionId,
          isShowBroken === 'true'
        );
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.post('/users', checkCurator, async (req, res, next) => {
    try {
        const { regionId } = req.authData;
        const {email, password, repeatPassword, firstName, lastName, middleName, position, cons_inn, cons_kpp} = req.body;
        const result = await User.createUserByCurator(email, password, repeatPassword, firstName, lastName, middleName, position, cons_inn, cons_kpp, regionId);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.post('/notifications', checkCurator, async (req, res, next) => {
    try {
        const { regionId } = req.authData;
        const {userIds, cons_UIDs, type, text, allUsers, allConsumers} = req.body;
        const result = await Curator.sendNotificationByCurator(userIds, cons_UIDs, type, text, allUsers, allConsumers, regionId);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.put('/many', checkLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const {ids, blocked, tabs, regionId} = req.body;
        const result = await Curator.updateManyCurators(ids, tabs, blocked, regionId);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.delete('/many', checkLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const {ids} = req.body;
        const result = await Curator.deleteManyCurators(ids);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/:id', checkLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const result = await Curator.getCuratorById(req.params.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.put('/:id', checkCuratorOrLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const {position, email, phone, password, repeatPassword, blocked, tabs, firstName, lastName, middleName, login, regionId} = req.body;
        if (req.curator && (String(req.curator._id) !== req.params.id)) throw unauthorized('Auth error'); 
        const result = await Curator.updateCuratorById(req.params.id, position, email, phone, password, repeatPassword, blocked, tabs, firstName, lastName, middleName, login, regionId);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.delete('/:id', checkLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const result = await Curator.deleteCurator(req.params.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

module.exports = router;