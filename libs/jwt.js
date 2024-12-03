/* eslint-disable no-async-promise-executor */
/* eslint-disable require-atomic-updates */
const jwt = require('jsonwebtoken');
const jwtKey = require('../config').keys.jwt;
const {Consumer, SubLogin, Curator, SuperAdmin, Admin} = require('../models');
const {unauthorized, forbidden} = require('boom');
const {getSsdUriByCons_UID} = require('./getSsdUriByConsumer');
const {createTokenActivity, checkTokenActivity, updateTokenLastActivityDate, deleteTokenLastActivity, isActiveToken} = require('../controllers/Token');

exports.sign = async (body) => {
    return new Promise(async (res, rej) => {
        const {userTokenActivity} = await createTokenActivity();
        body.activity = String(userTokenActivity._id);
        jwt.sign(body, jwtKey, async (err, token) => {
            if (err) {
                console.error(err);
                rej(err);
            }
            res(token);
        });
    });
};

exports.decodeToken = async (token) => {
    return new Promise(async (resolve, reject) => {
        jwt.verify(token, jwtKey, (err, data) => {
            if (err) {
                reject(err);
            }
            resolve(data);
        });
    });
};

const checkAndUpdateTokenActivity = async (_id, next) => {
	if (!_id || _id === 'undefined') return next(unauthorized('Auth error'));
    const result = await checkTokenActivity(_id);
    if (!result.status) {
        await deleteTokenLastActivity(_id);
        return next(unauthorized('Auth error'));
    }
    await updateTokenLastActivityDate(_id);
    return;
};

const checkLKAdmin = async (req, _res, next) => {
    try {
        let jwtToken = req.headers['x-access-token'];
        if (!jwtToken) return next(unauthorized('Ошибка авторизации'));
        jwt.verify(jwtToken, jwtKey, async (error, data) => {
            if (error) return next(unauthorized('Ошибка авторизации'));
            await checkAndUpdateTokenActivity(data.activity, next);
            req.authData = data;
            // if (!data.date || moment().diff(moment(data.date), 'minutes') > 1560)
            //     return next(unauthorized('Ошибка авторизации'));
            const admin = await Admin.findOne({_id: req.authData._id}, {password: 0}).lean();
            if (!admin) return next(unauthorized('Ошибка авторизации'));
            req.admin = admin;
            next();
        });
    } catch (err) {
        return next(unauthorized('Ошибка авторизации'));
    }
};

const getUser = async (req, _res, next) => {
    try {
        let jwtToken = req.headers['x-access-token'];
        if (!jwtToken) {
            req.authData = null;
            next();
        }
        jwt.verify(jwtToken, jwtKey, async (error, data) => {
            req.authData = data;
            // // if (!data.date || moment().diff(moment(data.date), 'minutes') > 1560)
            // //     return next(unauthorized('Ошибка авторизации'));
            // const admin = await Admin.findOne({_id: req.authData._id}, {password: 0}).lean();
            // if (!admin) return next(unauthorized('Ошибка авторизации'));
            // req.admin = admin;
            next();
        });
    } catch (err) {
        req.authData = null;
        next();
    }
};

const checkSuperAdmin = async (req, _res, next) => {
    try {
        let jwtToken = req.headers['x-access-token'];
        if (!jwtToken) return next(unauthorized('Ошибка авторизации'));
        jwt.verify(jwtToken, jwtKey, async (error, data) => {
            if (error) return next(unauthorized('Ошибка авторизации'));
            await checkAndUpdateTokenActivity(data.activity, next);
            req.authData = data;
            console.log("🚀 ~ file: jwt.js ~ line 97 ~ jwt.verify ~ data", data, req.authData)
            // if (!data.date || moment().diff(moment(data.date), 'minutes') > 1560)
            //     return next(unauthorized('Ошибка авторизации'));
            const admin = await SuperAdmin.findById(req.authData._id, {password: 0}).lean();
            console.log("🚀 ~ file: jwt.js ~ line 101 ~ jwt.verify ~ admin", admin)
            if (!admin) return next(unauthorized('Ошибка авторизации'));
            req.superAdmin = admin;
            next();
        });
    } catch (err) {
        return next(unauthorized('Ошибка авторизации'));
    }
};

const checkCurator = async (req, _res, next) => {
    try {
        let jwtToken = req.headers['x-access-token'];
        const cons_UID = req.headers['cons-uid'];
        if (!jwtToken) return next(unauthorized('Ошибка авторизации'));
        jwt.verify(jwtToken, jwtKey, async (error, data) => {
            if (error) return next(unauthorized('Ошибка авторизации'));
            await checkAndUpdateTokenActivity(data.activity, next);
            req.authData = data;
            // if (!data.date || moment().diff(moment(data.date), 'minutes') > 1560)
            //     return next(unauthorized('Ошибка авторизации'));
            const curator = await Curator.findOne({_id: req.authData._id}, {password: 0}).lean();
            const admin = await Admin.findOne({_id: req.authData._id}, {password: 0}).lean();
            if (admin) admin.cons_UID = cons_UID;
            req.admin = admin;
            if (admin) return next();
            if (!curator) return next(unauthorized('Ошибка авторизации'));
            curator.cons_UID = cons_UID;
            req.curator = curator;
            next();
        });
    } catch (err) {
        return next(unauthorized('Ошибка авторизации'));
    }
};

const checkToken = (anon) => async (req, _res, next) => {
    try {
        let jwtToken = req.headers['x-access-token'];
        const cons_UID = req.headers['cons-uid'];
        console.log('CONS_UID', cons_UID);
        if (anon === 'anon' && !jwtToken) return next();
        if (!jwtToken) return next(unauthorized('Ошибка авторизации'));
        jwt.verify(jwtToken, jwtKey, async (error, data) => {
            if (error) return next(unauthorized('Ошибка авторизации'));
            // await checkAndUpdateTokenActivity(data.activity, next);

            const active = await isActiveToken(data._id);
            if (!active) return next(unauthorized('Ошибка авторизации'));

            req.authData = data;
            // if (!data.date || moment().diff(moment(data.date), 'minutes') > 1560)
            //     return next(unauthorized('Ошибка авторизации'));
            const subLogin = await SubLogin.findOne({_id: req.authData._id}, {password: 0}).populate('user').lean();
            if (!subLogin || !subLogin.user || subLogin.blocked) return next(unauthorized('Ошибка авторизации'));
            req.subLogin = subLogin;
            if (!cons_UID) return next();
            if (subLogin.type === 'admin' || (subLogin.consumers && subLogin.consumers.includes(cons_UID))) {
                const consumer = await Consumer.findOne({cons_UID, user: subLogin.user._id}).populate('ssdUri');
                if (!consumer) return next(forbidden('Нет доступа к консамеру'));
                if (consumer) {
                    consumer.ssd_uri = consumer.ssdUri ? consumer.ssdUri.uri : null;
                    subLogin.ssd_uri = consumer.ssd_uri;
                }
                subLogin.consumer = consumer;
                subLogin.cons_UID = cons_UID;
            } else return next(forbidden('Нет доступа к консамеру'));
            next();
        });
    } catch (err) {
        return next(unauthorized('Ошибка авторизации'));
    }
};

const checkAdmin = async (req, _res, next) => {
    try {
        let jwtToken = req.headers['x-access-token'];
        const cons_UID = req.headers['cons-uid'];
        if (!jwtToken) return next(unauthorized('Ошибка авторизации'));
        jwt.verify(jwtToken, jwtKey, async (error, data) => {
            if (error) return next(unauthorized('Ошибка авторизации'));
            await checkAndUpdateTokenActivity(data.activity, next);
            req.authData = data;
            // if (!data.date || moment().diff(moment(data.date), 'minutes') > 1560)
            //     return next(unauthorized('Ошибка авторизации'));
            const subLogin = await SubLogin.findOne({_id: req.authData._id, type: 'admin'}, {password: 0}).populate('user').lean();
            if (!subLogin || !subLogin.user || subLogin.blocked) return next(unauthorized('Ошибка авторизации'));
            const isActive = await isActiveToken(subLogin._id);
            if (!isActive) return next(unauthorized('Ошибка авторизации'));
            
            req.subLogin = subLogin;
            if (!cons_UID) return next();
            const consumer = await Consumer.findOne({cons_UID, user: subLogin.user._id}).populate('ssdUri');
            if (consumer) {
                consumer.ssd_uri = consumer.ssdUri ? consumer.ssdUri.uri : null;
                subLogin.ssd_uri = consumer.ssd_uri;
            }
            if (!consumer) return next(forbidden('Нет доступа к консамеру'));
            subLogin.consumer = consumer;
            subLogin.cons_UID = cons_UID;
            next();
        });
    } catch (err) {
        next(unauthorized('Ошибка авторизации'));
    }
};

const checkCuratorOrUser = async (req, _res, next) => {
    try {
        let jwtToken = req.headers['x-access-token'];
        const cons_UID = req.headers['cons-uid'];
        req.cons_UID = cons_UID;
        if (!jwtToken) return next(unauthorized('Ошибка авторизации'));
        jwt.verify(jwtToken, jwtKey, async (error, data) => {
            if (error) return next(unauthorized('Ошибка авторизации'));
            req.authData = data;
            const [subLogin, curator, admin] = await Promise.all([
                SubLogin.findOne({_id: req.authData._id}, {password: 0}).populate('user').lean(),
                Curator.findOne({_id: req.authData._id}, {password: 0}).lean(),
                Admin.findOne({_id: req.authData._id}, {password: 0}).lean()
            ]);
            if (curator) {
                curator.cons_UID = cons_UID;
                curator.ssd_uri = await getSsdUriByCons_UID(cons_UID);
                curator.type = 'curator';
                req.curator = curator;
                return next();
            }
            if (admin) admin.cons_UID = cons_UID;
            req.admin = admin;
            if (admin) return next();
            if (!subLogin || !subLogin.user || subLogin.blocked) return next(unauthorized('Ошибка авторизации'));
            const isActive = await isActiveToken(subLogin._id);
            if (!isActive) return next(unauthorized('Ошибка авторизации'));

            req.subLogin = subLogin;
            if (!cons_UID) return next();
            if (subLogin.type === 'admin' || (subLogin.consumers && subLogin.consumers.includes(cons_UID))) {
                const consumer = await Consumer.findOne({cons_UID, user: subLogin.user._id}).populate('ssdUri');
                if (consumer) {
                    console.log(consumer.cons_UID, consumer.ssdUri);
                    consumer.ssd_uri = consumer.ssdUri ? consumer.ssdUri.uri : null;
                    subLogin.ssd_uri = consumer.ssd_uri;
                } else return next(forbidden('Нет доступа к консамеру'));
                subLogin.consumer = consumer;
                subLogin.cons_UID = cons_UID;
            } else return next(forbidden('Нет доступа к консамеру'));
            next();
        });
    } catch (err) {
        return next(unauthorized('Ошибка авторизации'));
    }
};

const checkAdminOrUser = async (req, _res, next) => {
    try {
        let jwtToken = req.headers['x-access-token'];
        const cons_UID = req.headers['cons-uid'];
        if (!jwtToken) return next(unauthorized('Ошибка авторизации'));
        jwt.verify(jwtToken, jwtKey, async (error, data) => {
            if (error) return next(unauthorized('Ошибка авторизации'));
            await checkAndUpdateTokenActivity(data.activity, next);
            req.authData = data;
            const [subLogin, admin] = await Promise.all([
                SubLogin.findOne({_id: req.authData._id}, {password: 0}).populate('user').lean(),
                Admin.findOne({_id: req.authData._id}, {password: 0}).lean()
            ]);
            if ((!subLogin || !subLogin.user || subLogin.blocked) && !admin) return next(unauthorized('Ошибка авторизации'));
            if (admin) {
                admin.cons_UID = cons_UID;
                admin.type = 'admin';
                req.admin = admin;
                return next();
            }
            if (!subLogin || !subLogin.user || subLogin.blocked) return next(unauthorized('Ошибка авторизации'));
            const isActive = await isActiveToken(subLogin._id);
            if (!isActive) return next(unauthorized('Ошибка авторизации'));

            req.subLogin = subLogin;
            if (!cons_UID) return next();
            if (subLogin.type === 'admin' || (subLogin.consumers && subLogin.consumers.includes(cons_UID))) {
                const consumer = await Consumer.findOne({cons_UID, user: subLogin.user._id}).populate('ssdUri');
                if (consumer) {
                    consumer.ssd_uri = consumer.ssdUri ? consumer.ssdUri.uri : null;
                    subLogin.ssd_uri = consumer.ssd_uri;
                } else return next(forbidden('Нет доступа к консамеру'));
                subLogin.consumer = consumer;
                subLogin.cons_UID = cons_UID;
            } else return next(forbidden('Нет доступа к консамеру'));
            return next();
        });
    } catch (err) {
        return next(unauthorized('Ошибка авторизации'));
    }
};

const checkLKAdminOrSuperAdmin = async (req, _res, next) => {
    try {
        let jwtToken = req.headers['x-access-token'];
        const cons_UID = req.headers['cons-uid'];
        if (!jwtToken) return next(unauthorized('Ошибка авторизации'));
        jwt.verify(jwtToken, jwtKey, async (error, data) => {
            if (error) return next(unauthorized('Ошибка авторизации'));
            await checkAndUpdateTokenActivity(data.activity, next);
            req.authData = data;
            const [admin, superAdmin] = await Promise.all([
                Admin.findOne({_id: req.authData._id}, {password: 0}).lean(),
                SuperAdmin.findOne({_id: req.authData._id}).lean()
            ]);
            if (!admin && !superAdmin) return next(unauthorized('Ошибка авторизации'));

            if (admin) admin.cons_UID = cons_UID;
            req.admin = admin;
            if (req.admin) req.admin.type = 'admin';
            req.superAdmin = superAdmin;
            next();
        });
    } catch (err) {
        return next(unauthorized('Ошибка авторизации'));
    }
};

const checkLKAdminOrCurator = async (req, _res, next) => {
    try {
        let jwtToken = req.headers['x-access-token'];
        const cons_UID = req.headers['cons-uid'];
        if (!jwtToken) return next(unauthorized('Ошибка авторизации'));
        jwt.verify(jwtToken, jwtKey, async (error, data) => {
            if (error) return next(unauthorized('Ошибка авторизации'));
            await checkAndUpdateTokenActivity(data.activity, next);
            req.authData = data;
            const [admin, curator] = await Promise.all([
                Admin.findOne({_id: req.authData._id}, {password: 0}).lean(),
                Curator.findOne({_id: req.authData._id}).lean()
            ]);
            if (!admin && !curator) return next(unauthorized('Ошибка авторизации'));

            if (admin) admin.cons_UID = cons_UID;
            req.admin = admin;
            if (req.admin) req.admin.type = 'admin';
            if (curator) {
                curator.cons_UID = cons_UID;
                curator.type = 'curator';
            }
            req.curator = curator;
            next();
        });
    } catch (err) {
        return next(unauthorized('Ошибка авторизации'));
    }
};

const checkLKAdminOrCuratorOrUser = async (req, _res, next) => {
    try {
        let jwtToken = req.headers['x-access-token'];
        const cons_UID = req.headers['cons-uid'];
        if (!jwtToken) return next(unauthorized('Ошибка авторизации'));
        jwt.verify(jwtToken, jwtKey, async (error, data) => {
            if (error) return next(unauthorized('Ошибка авторизации'));
            await checkAndUpdateTokenActivity(data.activity, next);
            req.authData = data;
            const [admin, curator, subLogin] = await Promise.all([
                Admin.findOne({_id: req.authData._id}, {password: 0}).lean(),
                Curator.findOne({_id: req.authData._id}).lean(),
                SubLogin.findOne({_id: req.authData._id}, {password: 0}).populate('user').lean(),
            ]);
            if (!admin && !curator && !subLogin) return next(unauthorized('Ошибка авторизации'));

            if (admin) {
                admin.cons_UID = cons_UID;
                req.admin = admin;
                if (req.admin) req.admin.type = 'admin';
                return next();
            }
            req.subLogin = subLogin;
            if (curator) {
                curator.cons_UID = cons_UID;
                curator.type = 'curator';
                req.curator = curator;
                return next();
            }
            if (!subLogin || !subLogin.user || subLogin.blocked) return next(unauthorized('Ошибка авторизации'));
            const isActive = await isActiveToken(subLogin._id);
            if (!isActive) return next(unauthorized('Ошибка авторизации'));

            if (!cons_UID) return next();
            if ((subLogin.type === 'admin') || (subLogin && subLogin.consumers && subLogin.consumers.includes(cons_UID))) {
                const consumer = await Consumer.findOne({cons_UID, user: subLogin.user._id}).populate('ssdUri');
                // if (!consumer) return next(unauthorized('Ошибка авторизации'));
                if (consumer) {
                    consumer.ssd_uri = consumer.ssdUri ? consumer.ssdUri.uri : null;
                    subLogin.ssd_uri = consumer.ssd_uri;
                } else return next(forbidden('Нет доступа к консамеру'));
                subLogin.consumer = consumer;
                subLogin.cons_UID = cons_UID;
            } else return next(forbidden('Нет доступа к консамеру'));
            return next();
        });
    } catch (err) {
        return next(unauthorized('Ошибка авторизации'));
    }
};

const checkLKAdminOrCuratorOrUserOrSuperUser = async (req, _res, next) => {
    try {
        let jwtToken = req.headers['x-access-token'];
        const cons_UID = req.headers['cons-uid'];
        if (!jwtToken) return next(unauthorized('Ошибка авторизации'));
        jwt.verify(jwtToken, jwtKey, async (error, data) => {
            if (error) return next(unauthorized('Ошибка авторизации'));
            await checkAndUpdateTokenActivity(data.activity, next);
            req.authData = data;
            const [admin, curator, subLogin, superAdmin] = await Promise.all([
                Admin.findOne({_id: req.authData._id}, {password: 0}).lean(),
                Curator.findOne({_id: req.authData._id}).lean(),
                SubLogin.findOne({_id: req.authData._id}, {password: 0}).populate('user').lean(),
                SuperAdmin.findOne({_id: req.authData._id}, {password: 0}).lean()
            ]);
            if (!admin && !curator && !subLogin && !superAdmin) return next(unauthorized('Ошибка авторизации'));

            if (admin) {
                admin.cons_UID = cons_UID;
                req.admin = admin;
                if (req.admin) req.admin.type = 'admin';
                return next();
            }
            if (subLogin) {
                const isActive = await isActiveToken(subLogin._id);
                if (!isActive) return next(unauthorized('Ошибка авторизации'));

                req.subLogin = subLogin;
            }
            if (curator) {
                curator.cons_UID = cons_UID;
                curator.type = 'curator';
                req.curator = curator;
                return next();
            }
            if (superAdmin) {
                req.superAdmin = superAdmin;
            }
            if (subLogin && (!subLogin.user || subLogin.blocked)) return next(unauthorized('Ошибка авторизации'));
            if (!cons_UID) return next();
            if ((subLogin.type === 'admin') || (subLogin && subLogin.consumers && subLogin.consumers.includes(cons_UID))) {

                const consumer = await Consumer.findOne({cons_UID, user: subLogin.user._id}).populate('ssdUri');
                // if (!consumer) return next(unauthorized('Ошибка авторизации'));
                if (consumer) {
                    consumer.ssd_uri = consumer.ssdUri ? consumer.ssdUri.uri : null;
                    subLogin.ssd_uri = consumer.ssd_uri;
                } else return next(forbidden('Нет доступа к консамеру'));
                subLogin.consumer = consumer;
                subLogin.cons_UID = cons_UID;
            } else return next(forbidden('Нет доступа к консамеру'));
            return next();
        });
    } catch (err) {
        return next(unauthorized('Ошибка авторизации'));
    }
};

const checkCuratorOrLKAdminOrSuperAdmin = async (req, _res, next) => {
    try {
        let jwtToken = req.headers['x-access-token'];
        const cons_UID = req.headers['cons-uid'];
        if (!jwtToken) return next(unauthorized('Ошибка авторизации'));
        jwt.verify(jwtToken, jwtKey, async (error, data) => {
            if (error) return next(unauthorized('Ошибка авторизации'));
            await checkAndUpdateTokenActivity(data.activity, next);
            req.authData = data;
            const [admin, curator, superAdmin] = await Promise.all([
                Admin.findOne({_id: req.authData._id}, {password: 0}).lean(),
                Curator.findOne({_id: req.authData._id}).lean(),
                SuperAdmin.findOne({_id: req.authData._id}, {password: 0}).populate('user').lean(),
            ]);
            if (!admin && !curator && !superAdmin) return next(unauthorized('Ошибка авторизации'));

            if (admin) {
                admin.cons_UID = cons_UID;
                req.admin = admin;
                if (req.admin) req.admin.type = 'admin';
                return next();
            }
            if (superAdmin) {
                req.superAdmin = superAdmin;
            }
            return next();
        });
    } catch (err) {
        return next(unauthorized('Ошибка авторизации'));
    }
};

const checkAnyThingWithoutError = async (req, _res, next) => {
    try {
        let jwtToken = req.headers['x-access-token'];
        const cons_UID = req.headers['cons-uid'];
        if (!jwtToken) return next();
        jwt.verify(jwtToken, jwtKey, async (error, data) => {
            if (error) return next(unauthorized('Ошибка авторизации'));
            await checkAndUpdateTokenActivity(data.activity, next);
            req.authData = data;
            const [admin, curator, subLogin] = await Promise.all([
                Admin.findOne({_id: req.authData._id}, {password: 0}).lean(),
                Curator.findOne({_id: req.authData._id}).lean(),
                SubLogin.findOne({_id: req.authData._id}, {password: 0}).populate('user').lean(),
            ]);

            if (admin) admin.cons_UID = cons_UID;
            req.admin = admin;
            req.subLogin = subLogin;
            if ((subLogin && subLogin.type === 'admin') || (subLogin && subLogin.consumers && subLogin.consumers.includes(cons_UID))) {
                const isActive = await isActiveToken(subLogin._id);
                if (!isActive) return next(unauthorized('Ошибка авторизации'));

                const consumer = await Consumer.findOne({cons_UID, user: subLogin.user._id}).populate('ssdUri');
                // if (!consumer) return next(unauthorized('Ошибка авторизации'));
                if (consumer) {
                    consumer.ssd_uri = consumer.ssdUri ? consumer.ssdUri.uri : null;
                    subLogin.ssd_uri = consumer.ssd_uri;
                    subLogin.consumer = consumer;
                    subLogin.cons_UID = cons_UID;
                }
            }
            if (req.admin) req.admin.type = 'admin';
            if (curator) {
                curator.cons_UID = cons_UID;
                curator.type = 'curator';
            }
            req.curator = curator;
            next();
        });
    } catch (err) {
        return next(unauthorized('Ошибка авторизации'));
    }
};

exports.checkCuratorOrUser = checkCuratorOrUser;
exports.checkAnyThingWithoutError = checkAnyThingWithoutError;
exports.checkUser = checkToken;
exports.checkAdmin = checkAdmin;
exports.checkCurator = checkCurator;
exports.checkSuperAdmin = checkSuperAdmin;
exports.checkLKAdmin = checkLKAdmin;
exports.checkLKAdminOrCurator = checkLKAdminOrCurator;
exports.checkAdminOrUser = checkAdminOrUser;
exports.checkLKAdminOrCuratorOrUser = checkLKAdminOrCuratorOrUser;
exports.getUser = getUser;
exports.checkLKAdminOrSuperAdmin = checkLKAdminOrSuperAdmin;
exports.checkCuratorOrLKAdminOrSuperAdmin = checkCuratorOrLKAdminOrSuperAdmin;
exports.checkLKAdminOrCuratorOrUserOrSuperUser = checkLKAdminOrCuratorOrUserOrSuperUser;
