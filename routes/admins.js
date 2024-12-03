const {Router} = require('express');
const router = Router();
const Admin = require('../controllers/Admin');
const Document = require('../controllers/DocumentController');
const {checkCuratorOrLKAdminOrSuperAdmin, checkUser, checkSuperAdmin} = require('../libs/jwt');
const { UserController, ContractController } = require('../controllers');
const { getMrgOrg, updateMrgOrg } = require('../controllers/AdminSetting');

router.post("/", checkSuperAdmin, async (req, res, next) => {
  try {
    const { login, password, repeatPassword, regionId } = req.body;
    const result = await Admin.create(login, password, repeatPassword, regionId);
    res.send(result);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", checkSuperAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { login, password, repeatPassword, regionId } = req.body;
    const result = await Admin.updateById(
      id,
      login,
      password,
      repeatPassword,
      regionId
    );
    res.send(result);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", checkSuperAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = Admin.delete(id);
    res.send(result);
  } catch (error) {
    next(error);
  }
});
  

router.get('/mrg_orgs', async (req, res, next) => {
    try {
        const result = await getMrgOrg();
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.put('/mrg_orgs', async (req, res, next) => {
    try {
        const result = await updateMrgOrg(req.body);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.post('/login', async (req, res, next) => {
    try {
        const {login, password} = req.body;
        const result = await Admin.login(login, password);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.post('/consumers/notifications', checkCuratorOrLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const {cons_UIDs, type, text, userIds, allConsumers, regionId} = req.body;
        const result = await Document.createConsumerNotification(cons_UIDs, type, text, userIds, allConsumers, regionId);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/consumers/notifications', checkCuratorOrLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const {limit, page, regionId} = req.query;
        const result = await Document.getConsumerNotifications(page, limit, regionId);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/consumers/notifications/:id', checkCuratorOrLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const result = await Document.getConsumerNotificationOfUserById({}, req.params.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/consumers/notifications_by_user', checkUser(), async (req, res, next) => {
    try {
        const {new_n, page, limit} = req.query;
        const result = await Document.getConsumerNotificationsOfUser(req.subLogin, new_n, page, limit);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/consumers/notifications_by_user/all/viewing', checkUser(), async (req, res, next) => {
    try {
        const result = await Document.viewedAllConsumerNotification(req.subLogin);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/consumers/notifications_by_user/:id', checkUser(), async (req, res, next) => {
    try {
        const result = await Document.getConsumerNotificationOfUserById(req.subLogin, req.params.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.delete('/consumers/notifications_by_user/:id', checkSuperAdmin, async (req, res, next) => {
    try {
        const result = await Document.deleteConsumerNotification(req.params.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/contracts', checkSuperAdmin, async (req, res, next) => {
    try {
        const result = await ContractController.listForAdmin(req.query.cons_UIDs, req.query.contr_status);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/users', checkCuratorOrLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const {email, name, page, limit, regionId} = req.query;
        const result = await UserController.getUsers({email, name, regionId}, {page, limit});
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/users/consumers/:id', checkCuratorOrLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const result = await UserController.getConsumerById(req.params.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/users/:id', checkCuratorOrLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const result = await UserController.getUserById(req.params.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.put('/users/blocked', checkCuratorOrLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const {userId, subLoginId, consumerId, blocked} = req.body;
        const result = await UserController.blockUser(userId, subLoginId, consumerId, blocked);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.put('/users/sub_logins/:id', checkCuratorOrLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const {type, essences, blocked, firstName, lastName, middleName, tabs, position, roleIds, regionId} = req.body;
        const result = await UserController.updateSubLogin(req.admin || req.curator, req.params.id, type, essences, blocked, firstName, lastName, middleName, tabs, position, roleIds, regionId);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

module.exports = router;