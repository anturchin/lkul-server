const {Router} = require('express');
const router = Router();
const requestIp = require('request-ip');
// const {captchaSecretKey} = require('../config');

const {checkUser, checkLKAdminOrSuperAdmin, checkLKAdminOrCuratorOrUserOrSuperUser} = require('../libs/jwt');
// const googleReCaptcha = require('google-recaptcha');
// const captcha = new googleReCaptcha({secret: captchaSecretKey});
const User = require('../controllers/UserController');

router.post('/register', async (req, res, next) => {
    try {
        // let e = false;
        // const recaptchaResponse = req.body['g-recaptcha-response'];
        // captcha.verify({response: recaptchaResponse}, async (error) => {
        //     if (error) {
        //         e = true;
        //     }
        // });
        // if (e) return res.status(400).send({isHuman: false});
        const result = await User.register(req.body);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.post('/notices', checkLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const {message, type} = req.body;
        const result = await User.createNotice(req.subLogin, message, type);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/notices', checkUser(), async (req, res, next) => {
    try {
        const {all} = req.query;
        const result = await User.getNotices(req.subLogin, all);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/notices/:id', checkUser(), async (req, res, next) => {
    try {
        const result = await User.getNoticeById(req.subLogin, req.params.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.post('/register_new', async (req, res, next) => {
    try {
        // let e = false;
        // const recaptchaResponse = req.body['g-recaptcha-response'];
        // captcha.verify({response: recaptchaResponse}, async (error) => {
        //     if (error) {
        //         e = true;
        //     }
        // });
        // if (e) return res.status(400).send({isHuman: false});
        const result = await User.registerNew(req.body);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.post('/register_new_confirm', async (req, res, next) => {
    try {
        const {codeId, code} = req.body;
        const result = await User.confirmNewRegister(codeId, code);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.post('/sert_list', checkUser([]), async (req, res, next) => {
    try {
        const {sertList} = req.body;
        const result = await User.sertificateList(sertList);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.post('/auth_by_sert', checkUser([]), async (req, res, next) => {
    try {
        const {sert} = req.body;
        const result = await User.authBySert(sert);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.post('/consumers', checkLKAdminOrCuratorOrUserOrSuperUser, async (req, res, next) => {
    try {
        const {email, cons_inn, cons_kpp} = req.body;
        const result = await User.putConsumer(req.subLogin, email, cons_inn, cons_kpp);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/consumers', checkUser(), async (req, res, next) => {
    try {
        const result = await User.getConsumers(req.subLogin);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.post('/consumers/confirm', checkLKAdminOrCuratorOrUserOrSuperUser, async (req, res, next) => {
    try {
        const {codeId, code} = req.body;
        const result = await User.putConsumerConfirm(req.subLogin, codeId, code);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.put('/consumers/:id', checkLKAdminOrCuratorOrUserOrSuperUser, async (req, res, next) => {
    try {
        const {name} = req.body;
        const result = await User.updateConsumer(req.subLogin, req.params.id, name);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.delete('/consumers/:cons_uid', checkLKAdminOrCuratorOrUserOrSuperUser, async (req, res, next) => {
    try {
        const result = await User.deleteConsumer(req.subLogin, req.params.cons_uid);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.post('/confirm', async (req, res, next) => {
    try {
        const {codeId, code} = req.body;
        const result = await User.confirm(codeId, code);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.post('/login', async (req, res, next) => {
    try {
        // let e = false;
        // const recaptchaResponse = req.body['g-recaptcha-response'];
        // captcha.verify({response: recaptchaResponse}, async (error) => {
        //     if (error) {
        //         e = true;
        //     }
        // });
        // if (e) return res.status(400).send({isHuman: false});
        const ip = requestIp.getClientIp(req);
        req.body.ip = ip; 
        const result = await User.login(req.body);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.put('/reset_password', async (req, res, next) => {
    try {
        const {login} = req.body;
        const result = await User.resetPassword(login);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.put('/check_code', async (req, res, next) => {
    try {
        const {code, codeId} = req.body;
        const result = await User.checkCode(codeId, code);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.put('/reset_password/confirm', async (req, res, next) => {
    try {
        const {codeId, code, password, repeatPassword} = req.body;
        const result = await User.resetPasswordConfirm(codeId, code, password, repeatPassword);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.put('/change_password', checkLKAdminOrCuratorOrUserOrSuperUser, async (req, res, next) => {
    try {
        const {password, repeatPassword, subLoginId} = req.body;
        const result = await User.changePassword(req.subLogin, password, repeatPassword, subLoginId);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/', checkUser(), (req, res, _next) => {
    res.send(req.subLogin);
});

router.get('/roles', checkUser(), async (req, res, next) => {
    try {
        const result = await User.getRoles(req.subLogin.user._id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.post('/roles', checkLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const {type, tabs} = req.body;
        const result = await User.createRoles(req.subLogin.user._id, type, tabs);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.put('/roles/:id', checkLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const {tabs} = req.body;
        const result = await User.updateRoles(req.subLogin.user._id, req.params.id, tabs);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.delete('/roles/:id', checkLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const result = await User.deleteRoles(req.subLogin.user._id, req.params.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/roles/:id', checkLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const result = await User.getRoleById(req.subLogin.user._id, req.params.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/sub_logins', checkUser([]), async (req, res, next) => {
    try {
        const result = await User.subLoginList(req.subLogin);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.post('/sub_logins', checkUser([]), async (req, res, next) => {
    try {
        const {login, firstName, lastName, middleName, tabs, type, roleIds, front_uri, position, consumers, contracts} = req.body;
        const result = await User.createSubLogin(req.subLogin, login, type, firstName, lastName, middleName, tabs, roleIds, front_uri, position, consumers, contracts);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.put('/link/:str', async (req, res, next) => {
    try {
        const {password, repeatPassword} = req.body;
        const result = await User.updatePasswordByLink({str: req.params.str, password, repeatPassword});
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/sub_logins/:id', checkUser([]), async (req, res, next) => {
    try {
        const result = await User.subLoginById(req.params.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.put('/sub_logins/:id', checkUser([]), async (req, res, next) => {
    try {
        const {essences, type, blocked = null, firstName, lastName, middleName, tabs, position, roleIds, regionId} = req.body;
        const result = await User.updateSubLogin(req.subLogin, req.params.id, type, essences, blocked, firstName, lastName, middleName, tabs, position, roleIds, regionId);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.put('/sub_logins/:id/role_types', checkUser([]), async (req, res, next) => {
    try {
        const {roleTypes} = req.body;
        const result = await User.giveRoleTypeToSubLogin(req.params.id, roleTypes);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.delete('/sub_logins/:id', checkLKAdminOrCuratorOrUserOrSuperUser, async (req, res, next) => {
    try {
        const result = await User.deleteSubLogin(req.params.id, req.subLogin);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.post('/login_sbis', checkUser([]), (req, res, next) => {
    User.loginSBIS(req.body)
        .then(result => res.send(result))
        .catch(err => next(err));
});

router.delete('/:id', checkUser([]), async (req, res, next) => {
    try {
        const result = await User.deleteUser(req.subLogin, req.params.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.post('/disable-all', checkLKAdminOrSuperAdmin, async (req,res) => {
    try {
        const result = await User.expireAllUserTokens();
        res.send(result);
    } catch (err) {
        next(err);
    }
});

module.exports = router;