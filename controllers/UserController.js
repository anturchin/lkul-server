/* eslint-disable require-atomic-updates */
const {badData, badRequest, unauthorized, conflict, notFound, tooManyRequests, paymentRequired, forbidden, gatewayTimeout} = require('boom');
const boom = require('boom');
const {validate} = require('email-validator');
const jwt = require('../libs/jwt');
const auth = require('vvdev-auth');
const qConsumerRegistration = require('../requests/qConsumerRegistration');
const sendEmail = require('../libs/sendEmail');
const loginSBIS = require('../sbis/auth');
const ConfirmCode = require('../models/ConfirmCode');
const Consumer = require('../models/Consumer');
const qPromConsumerInfo = require('../requests/qPromConsumerInfo');
const Role = require('../models/Role');
const { Notice} = require('../models');
const User = require('../models/User');
const SubLogin = require('../models/SubLogin');
const moment = require('moment');
const crypto = require('crypto');
const qConsumerConnectionLK = require('../requests/qConsumerConnectionLK');
const {getSsdUriByConsumer} = require('../libs/getSsdUriByConsumer');
const sertificateList = require('../sbis/sertificateList');
const authBySert = require('../sbis/authBySert');
const SsdUri = require('../models/SsdUri');
const uuid = require('uuid');
const NotificationController = require('./NotificationController');
const pageLimitPagination = require('../libs/pageLimitPagination');
const Notification = require('../models/Notification');
const {saveUserTokenActivity} = require('../controllers/Token');
const UserTokenActivity = require('../models/UserTokenActivity');
const _ = require('lodash');
const PromisePool = require('@supercharge/promise-pool');

const sendEmailText = (code, login, firstName, lastName, middleName, cons_full_name) => {
    const text = `
Осуществляется попытка подключения${cons_full_name ? ' ' + cons_full_name + ' ' : ' '}к личному кабинету ЛКК ЮЛ ДЗО.
Пин-код для подключения: ${code}
Дата: ${moment().format('DD-MM-YYYY')}
Логин пользователя: ${login}
${lastName || firstName || middleName ? 'ФИО пользователя: ' + lastName + '' + firstName + '' + middleName : ''}
${cons_full_name ? 'Наименование Потребителя: ' + cons_full_name : ' '}
Если данное действие осуществляется без Вашего согласия, обратитесь в службу технической поддержки ЛКК ЮЛ ДЗО Support_lkul@abr-region.ru`;
    return text;
};

const getRegisterData = async (cons_inn, cons_kpp, email, ssd_uri) => {
    const data = await qConsumerRegistration(cons_inn, cons_kpp, email, ssd_uri);
    return data;
};

const checkExistsUserOrSubLogin = async (email) => {
    const [existsUser, existsSubLogin] = await Promise.all([
        User.findOne({email}),
        SubLogin.findOne({login: email})
    ]);
    if (existsUser || existsSubLogin) throw conflict('Email уже зарегистрирован');
};

const generateDigitalPassword = ( length = 6 ) => {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(length / 2, (error, buffer) => {
            if (error)
                reject(error);
            const bufferString = buffer.toString('hex');
            let password = '';
            for (let i = 0; i < length; i++ )
                password += parseInt( bufferString.charAt(i), 16 ) % 10;
            resolve(password); 
        });
    });
};

// const checkSsdUri = async (cons_UID) => {
//     const ssds = await SsdUri.find();
//     for (const ssd of ssds) {
//         const result = await qPromConsumerInfo(cons_UID, ssd.uri);
//         if (result.cons_UID) return ssd._id;
//     }
//     return;
// };

const checkTab = async (_tabSetting) => {
    return true;
    // const {name, read, write} = tabSetting;
    // if (!name || (read !== true && read !== false) || (write !== true && write !== false))
    //     return false;
    // const tab = await Tab.findOne({name});
    // if (!tab) return false;
    // return true;
};

const checkLogin = (login) => {
    const pattern = new RegExp('^(.[a-zA-Z0-9_-]*){5}$');
    if (!pattern.test(login)) throw badRequest('Логин должен содержать только латинские буквы, числа, - или _ и быть длиннее 5 символов');
};

const tabsIntersection = (roles) => {
    const resultObject = {};
    for (const role of roles) {
        for (const tab of role.tabs) {
            resultObject[tab.name] = {
                name: tab.name,
                read: resultObject[tab.name] ? resultObject[tab.name].read : tab.read,
                write: resultObject[tab.name] ? resultObject[tab.name].write : tab.write
            };
        }
    }
    return Object.values(resultObject);
};

const createUser = async (consumers, email, password, firstName, lastName, middleName, position = 'Администратор', ssdUri, regionId) => {
    await checkExistsUserOrSubLogin(email);
    const user = await User({
        email,
        regionId
    }).save();
    const cons_UIDs = [];
    const cons = [];
    for (const consumer of consumers) {
        const {cons_inn, cons_kpp, cons_uid, cons_full_name, lkp} = consumer;
        if (cons_uid) {
            const consumer = await Consumer.findOne({cons_UID: cons_uid, user: user._id});
            if (consumer) continue;
            cons_UIDs.push(cons_uid);
            const c = await Consumer({
                user: user._id,
                cons_inn, 
                cons_kpp,
                cons_UID: cons_uid,
                cons_full_name,
                lkp,
                email,
                ssdUri
            }).save(); 
            await qConsumerConnectionLK(true, cons_uid, ssdUri, email);
            cons.push(c);
        }
    }
    const subLogin = await SubLogin({
        type: 'admin',
        user: user._id,
        login: email,
        email,
        password,
        consumers: cons_UIDs,
        tabs: [],
        firstName,
        lastName,
        middleName,
        position
    }).save();
    await exports.createDefaultRoles(user._id);
    return {user, consumers: cons, subLogin};
};

function checkPassword(password, repeatPassword) {
    if (!password || !repeatPassword || password !== repeatPassword) throw badData('Пароли не совпадают');
    if (password.length < 8 || !/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/.test(password)) throw badData('Пароль должен быть длиной от 8 символов: содержать большие и маленькие латинские буквы, а также числа');
}

const checkInn = (inn) => {
    return !/^([0-9]{10}|[0-9]{12})$/.test(inn);
};


exports.getUsers = async ({email, name, regionId}, {page, limit}) => {
    const query = {};
    ({page, limit} = pageLimitPagination(page, limit));
    if (email) query.email = new RegExp(email, 'gi');
    if (name) {
        const names = name.split(' ');
        const subLoginQuery = {$and: [], type: 'admin'};
        for (const n of names) {
            const $or = [{firstName: new RegExp(n, 'gi')}, {lastName: new RegExp(n, 'gi')}, {middleName: new RegExp(n, 'gi')}];
            subLoginQuery.$and.push({$or});
        }
        const subLogins = await SubLogin.find(subLoginQuery, {user: 1}).lean();
        query._id = {$in: subLogins.map(s => s.user)};
        
    }
    if (regionId) {
      query.regionId = regionId;
    }
    const [users, count] = await Promise.all([
        User.find(query).lean().limit(limit).skip(limit * (page - 1)),
        User.countDocuments(query),
    ]);
    for (const user of users) {
        const [consumers, subLogins, subLoginAdmin] = await Promise.all([
            Consumer.find({user: user._id}),
            SubLogin.find({user: user._id}),
            SubLogin.findOne({user: user._id, type: 'admin'})
        ]);
        user.consumers = consumers;
        user.subLogins = subLogins;
        if (subLoginAdmin) {
            user.firstName = subLoginAdmin.firstName;
            user.lastName = subLoginAdmin.lastName;
            user.middleName = subLoginAdmin.middleName;
            user.type = subLoginAdmin.type;
            user.tabs = subLoginAdmin.tabs;
            user.contracts = subLoginAdmin.contracts;
        }
        if (!user.blocked) user.blocked = false;
    }
    return {
        users,
        count,
    };
};

exports.getUserById = async (_id) => {
    const user = await User.findById(_id).lean();
    const [consumers, subLogins, subLoginAdmin] = await Promise.all([
        Consumer.find({user: user._id}).populate({path: 'ssdUri', model: 'ssd_uri', select: 'name email uri'}).lean(),
        SubLogin.find({user: user._id}),
        SubLogin.findOne({user: user._id, type: 'admin'})
    ]);
    const consumerInfo = await Promise.all(
      consumers.map((c) =>
        qPromConsumerInfo(c.cons_UID, getSsdUriByConsumer(c)).catch(console.log)
      )
    );
    
    const cons_UIDs = consumerInfo.filter(c => c).map(c => c.cons_uid);
    user.consumers = consumers.filter(c => cons_UIDs.includes(c.cons_UID));
    user.subLogins = subLogins;
    if (subLoginAdmin) {
        user.firstName = subLoginAdmin.firstName;
        user.lastName = subLoginAdmin.lastName;
        user.middleName = subLoginAdmin.middleName;
        user.type = subLoginAdmin.type;
    }
    if (!user.blocked) user.blocked = false;
    return {user};
};

exports.blockUser = async (userId, subLoginId, consumerId, blocked = false) => {
    if (userId) {
        const user = await User.findOne({_id: userId});
        if (!user) throw notFound('User not found');
        user.blocked = blocked;
        await user.save();
    }
    if (subLoginId) {
        const subLogin = await SubLogin.findOne({_id: subLoginId});
        if (!subLogin) throw notFound('SubLogin not found');
        subLogin.blocked = blocked;
        await subLogin.save();
    }
    if (consumerId) {
        const consumer = await Consumer.findOne({_id: consumerId});
        if (!consumer) throw notFound('Consumer not found');
        consumer.blocked = blocked;
        await consumer.save();
    }
    return {message: 'ok'};
};

exports.deleteUser = async (subLogin, _id) => {
    const query = {_id};
    if (subLogin) {
        query._id = subLogin.user._id;
    }
    const userDel = await User.findOne(query);
    if (!userDel) throw notFound('Пользователь не найден');
    const [consumers, subLogins] = await Promise.all([
        Consumer.find({user: userDel._id}, {_id: 1}).lean(),
        SubLogin.find({user: userDel._id, type: {$ne: 'admin'}}, {_id: 1}).lean()
    ]);
    if (consumers && consumers.length) throw conflict('Удаление невозможно, т.к. имеются подключенные Потребители');
    if (subLogins && subLogins.length) throw conflict('Удаление невозможно, т.к. имеются сублогины');
    await Consumer.deleteMany({user: userDel._id});
    await SubLogin.deleteMany({user: userDel._id});
    await User.deleteOne({_id});
    await Notification.deleteMany({user: _id});
    return {message: 'ok'};
};

exports.register = async (data, isSendSms = true) => {
    let {email, password, repeatPassword, cons_inn, cons_kpp, firstName, lastName, middleName, regionId} = data;
    email = email.toLowerCase().trim();
    let confirmCode = await ConfirmCode.findOne({email});
    if (confirmCode && confirmCode.updatedAt && moment().diff(confirmCode.updatedAt, 'minutes') < 1) throw tooManyRequests('Повторите чуть позже');
    await ConfirmCode.deleteOne({email});
    if (checkInn(cons_inn)) throw badRequest('Некорректный ИНН');
    checkPassword(password, repeatPassword);
    if (!validate(email)) throw badData('Некорректный адрес эл почты');
    return Promise.all([
        User.findOne({email}),
        SubLogin.findOne({login: email})
    ])
        .then(async ([us1, subLogin1]) => {
            if (us1 || subLogin1) throw conflict('Данный почтовый адрес уже используется');
            let registerData = {};
            let ssd = null;
            const ssdUris = await SsdUri.find({regionId});
            if (!ssdUris.length) {
              throw notFound("Отсутстуют источники данных.");
            }
            for (const s of ssdUris) {
                ssd = s;
                registerData = await qConsumerRegistration(cons_inn, cons_kpp, email, ssd.uri);
                if ([0, 1, 2, 3].includes(registerData.status)) break;
            }
            const {status, consumers, message} = registerData;
            if (status !== 0) throw paymentRequired(message || 'Не найден действующий "Потребитель" или "Покупатель" по регистрационным данным! Уточнить корректные сведения можно у Вашего куратора.');
            const hash = await auth.hashPassword(password);
            confirmCode = new ConfirmCode({email, consumers, hash, firstName, lastName, middleName, ssdUri: ssd._id});
            const code = await generateDigitalPassword();
            confirmCode.code = code; 
            await confirmCode.save();
            if (isSendSms) {
                const text = sendEmailText(code, email, firstName, lastName, middleName, consumers && consumers[0] ? consumers[0].cons_full_name : null);
                await sendEmail(email, text);
            }
            return {code, codeId: confirmCode._id};
        });
};


exports.confirm = async (codeId, code, position) => {
    const confirmCode = await ConfirmCode.findOne({_id: codeId}).populate('ssdUri');
    if (!confirmCode || !confirmCode.code || confirmCode.code !== code) {
        if (confirmCode && confirmCode.consumers) {
            for (const c of confirmCode.consumers) {
                try {
                    await qConsumerConnectionLK(false, c.cons_uid, confirmCode.ssdUri ? confirmCode.ssdUri.uri : null, confirmCode.email);
                } catch (err) {
                    console.error(err);
                }
            }
        }
        throw unauthorized('Ошибка авторизации');
    }
    const {consumers, email, hash, firstName, lastName, middleName, ssdUri, regionId} = confirmCode;
    await ConfirmCode.deleteOne({_id: codeId});
    const result = await createUser(consumers, email, hash, firstName, lastName, middleName, position, ssdUri, regionId);
    const consumerObjects = result.consumers;
    const {user, subLogin} = result;
    await user.save();
    if (!subLogin) throw unauthorized('Пользователь с таким Email не найден');
    const token = await jwt.sign({
        _id: subLogin._id,
        login: subLogin.login
    });
    return {
        token, 
        _id: subLogin._id,
        tabs: subLogin.tabs,
        type: subLogin.type,
        cons_UIDs: consumerObjects.map(c => c.cons_UID),
        consumers: consumerObjects.map(c => {
            return {
                cons_full_name: c.cons_full_name,
                cons_UID: c.cons_UID
            };
        })
    };
};

exports.login = async (data) => {
    let {login, password} = data;
    if (!login) throw badRequest('Введите логин');
    const logRex = new RegExp(login, 'gi');
    return SubLogin.findOne({login: logRex})
        .populate('user')
        .then(subLogin => {
            if (!subLogin) throw unauthorized('Проверьте правильность ввода логина и пароля');
            if (!subLogin.password) throw unauthorized('Проверьте правильность ввода логина и пароля');
            if (subLogin.blocked) throw unauthorized('Пользователь заблокирован Web-администратором ЛКЮЛ. Для получения дополнительной информации обратитесь F0500509@gazmsk.ru');
            if (!subLogin.user || subLogin.user.blocked) throw unauthorized('Пользователь заблокирован Web-администратором ЛКЮЛ. Для получения дополнительной информации обратитесь F0500509@gazmsk.ru');
            if (subLogin.authBlockedDate && moment(subLogin.authBlockedDate).diff(new Date(), 'seconds') > -60) throw new boom('Достигнуто максимальное количество попыток, повторите позже!', {data: {date: subLogin.authBlockedDate}, statusCode: 401});
            return auth.checkPassword(password, subLogin.password)
                .then(async result => {
                    if (!result) {
                        if (!subLogin.authBlockedCount) subLogin.authBlockedCount = 0;
                        subLogin.authBlockedCount++;
                        const count = subLogin.authBlockedCount;
                        if (subLogin.authBlockedCount >= 5) {
                            subLogin.authBlockedCount = 0;
                            subLogin.authBlockedDate = new Date();
                        }
                        await subLogin.save();
                        throw new boom('Проверьте правильность ввода логина и пароля', {data: {count}, statusCode: 401});
                    }
                    subLogin.authBlockedCount = 0;
                    if (!subLogin.user) throw unauthorized('Confirm user!');
                    const body = {
                        _id: subLogin._id,
                        date: new Date(),
                        login: subLogin.login,
                        regionId: subLogin.user.regionId
                    };
                    const token = await jwt.sign(body);

                    const expiredAt = new Date();
                    expiredAt.setHours(new Date().getHours() + 1);
                    await saveUserTokenActivity(body._id, expiredAt.getTime());
                    // const {consumers_lkp = []} = await qConsumerIdentityCode(subLogin.consumers);
                    const consumers = await Consumer.find({
                      //   cons_UID: { $in: subLogin.consumers },
                      user: subLogin.user._id,
                      blocked: { $ne: true },
                    })
                      .populate('ssdUri')
                      .lean();
                    
                    const resultConsumers = [];
                    for (const c of consumers) {
                        resultConsumers.push(c.cons_UID);
                    }
                    subLogin.consumers = resultConsumers;
                    await subLogin.save();

                    const cons =
                      consumers && consumers[0]
                        ? consumers.filter((c) => {
                            if (!c.ssdUri) {
                              return false;
                            }
                            if (!c.ssdUri.regionId) {
                                return false;
                            }
                            if (!subLogin.user.regionId) {
                                return false;
                            }
                            return (
                              c.ssdUri.regionId.toString() ==
                              subLogin.user.regionId.toString()
                            );
                          })
                        : [];
                    return {
                      token,
                      _id: subLogin._id,
                      tabs: subLogin.tabs,
                      type: subLogin.type,
                      regionId: subLogin.user.regionId,
                      cons_UIDs: cons.length
                        ? cons.map((c) => c.cons_UID)
                        : null,
                      consumers: cons.length
                        ? cons.map((c) => ({
                            cons_full_name: c.cons_full_name,
                            cons_UID: c.cons_UID,
                          }))
                        : null,
                    };
                });
        });
};


exports.registerNew = async (data) => {
    const {password, repeatPassword, firstName, lastName, middleName, regionId} = data;
    const email = data.email.toLowerCase().trim();
    await checkExistsUserOrSubLogin(email);
    await checkPassword(password, repeatPassword);
    const code = await generateDigitalPassword();
    const hash = await auth.hashPassword(password);
    const confirmCode = await ConfirmCode({code, email, hash, firstName, lastName, middleName, regionId}).save();
    const text = sendEmailText(code, email, firstName, lastName, middleName, null);
    await sendEmail(email, text);
    return {code, codeId: confirmCode._id};
};

exports.createDefaultRoles = async (userId) => {
    let roles = await Role.find({user: null});
    for (const role of roles) {
        try {
            await exports.createRoles(userId, role.type, role.tabs);
        } catch (err) {
            continue;
        }
    }
    return;
};

exports.createUserByCurator = async (email, password, repeatPassword, firstName, lastName, middleName, position, cons_inn, cons_kpp, regionId) => {
    email = email.toLowerCase().trim();
    const {codeId, code} = await exports.register({email, password, repeatPassword, firstName, lastName, middleName, cons_inn, cons_kpp, regionId}, false);
    const result = await exports.confirm(codeId, code, position);
    return result;
};

exports.confirmNewRegister = async (codeId, code) => {
    const confirmCode = await ConfirmCode.findOne({_id: codeId, code});
    if (!confirmCode) throw unauthorized('Auth error');
    const {email, hash, regionId} = confirmCode;
    await checkExistsUserOrSubLogin(email);
    const {subLogin} = await createUser([], email, hash, null, null, null, 'admin', null, regionId);
    const body = {
        _id: subLogin._id,
        date: new Date(),
        login: subLogin.login,
        regionId,
    };

    const token = await jwt.sign(body);
    return {
        token,
        tabs: subLogin.tabs,
        type: subLogin.type,
    };
};

exports.getConsumers = async (subLogin) => {
    const query = {user: subLogin.user._id, blocked: {$ne: true}};
    if (subLogin.type !== 'admin') {
        query.cons_UID = {$in: subLogin.consumers};
    }
    const consumers = await Consumer.find(query).populate({path: 'ssdUri', model: 'ssd_uri', select: 'name email uri regionId'}).lean();

    let brokenConsumers = {};
    let uniqueConsumers = {};
    for (const consumer of consumers) {
        const uri = getSsdUriByConsumer(consumer);

        if (!uri) {
          brokenConsumers[consumer.cons_UID] = {
            ...consumer,
            cons_INN: consumer.cons_inn,
            cons_KPP: consumer.cons_kpp,
            broken: true,
          };
        } else {
          consumer.uri = uri;
          consumer.regionId = consumer.ssdUri.regionId;
          uniqueConsumers[consumer.cons_UID] = consumer;
        }

        if (
          consumer.ssdUri &&
          consumer.ssdUri.regionId &&
          subLogin.user &&
          subLogin.user.regionId &&
          consumer.ssdUri.regionId.toString() ==
            subLogin.user.regionId.toString()
        ) {
          consumer.uri = uri;
          consumer.regionId = consumer.ssdUri.regionId;
          uniqueConsumers[consumer.cons_UID] = consumer;
        }
    }

    let consumersBySsd = {};
    for (const consumer of Object.values(uniqueConsumers)) {
      if (!consumersBySsd[consumer.uri]) {
        consumersBySsd[consumer.uri] = [];
      }
      consumersBySsd[consumer.uri].push(consumer);
    }

    const { results, errors } = await PromisePool.withConcurrency(5)
      .for(Object.values(consumersBySsd))
      .process(async (cons) => {
        const uri = cons[0].uri;
        const conses = [];
        for (const c of cons) {
          const consInfo = await qPromConsumerInfo(c.cons_UID, uri);
          if (!consInfo) {
              continue;
          }
          const [notification] = await NotificationController.getList(
            subLogin,
            c.cons_UID
          );
          consInfo.regionId = c.ssdUri.regionId;
          c.notification = notification;
          c.notificationEmails = notification ? notification.emails || [] : [];
          consInfo.consumer = c;
          conses.push({ ...consInfo, broken: false });
        }
        return conses;
      });

    console.log(errors);

    const allFineConsumers = _.flatten(results);
    return [...Object.values(brokenConsumers), ...allFineConsumers];
}

exports.putConsumer = async (subLogin, email, cons_inn, cons_kpp) => {
    // const consumer = await Consumer.findOne({email, cons_inn, cons_kpp, user: subLogin.user._id});
    // if (consumer) throw badRequest('Consumer с таким ИНН, КПП и email уже зарегистрирован');
    if (!email) throw badRequest('Введите почту');
    email = email.toLowerCase().trim();
    let registerData = {};
    let ssd = null;
    // const ssdUris = await SsdUri.find({});
    const ssdUris = await SsdUri.find({regionId: subLogin.user.regionId});
    if (!ssdUris.length) {
      throw notFound("Отсутстуют источники данных.");
    }
    for (const s of ssdUris) {
        ssd = s;
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            reject("Источник данных не доступен. Попробуйте позже");
          }, 30 * 1000);
          getRegisterData(cons_inn, cons_kpp, email, ssd.uri)
            .then((result) => {
              registerData = result;
              resolve();
            })
            .catch(() => {
              reject("Источник данных не доступен. Попробуйте позже");
            });
        }).catch((err) => {
          console.error("CATCH", err);
          throw gatewayTimeout(err);
        });
        
        if (registerData && registerData.status === 0) break;
    }
    if (!registerData) registerData = {};
    const {status = false, message, consumers} = registerData;
    if (status !== 0) throw paymentRequired(message || 'Не найден действующий "Потребитель" или "Покупатель" по регистрационным данным! Уточнить корректные сведения можно у Вашего куратора.');
    const code = await generateDigitalPassword();
    for (const cons of consumers) {
        const c = await Consumer.findOne({cons_UID: cons.cons_uid, user: subLogin.user._id});
        if (c) throw conflict('Потребитель с такими ИНН и КПП уже зарегистрирован');
    }
    const confirmCode = await ConfirmCode({
      email,
      consumers,
      code,
      ssdUri: ssd._id,
      regionId: ssd.regionId,
    }).save();
    const {login, firstName, lastName, middleName} = subLogin;
    const text = sendEmailText(code, login, firstName, lastName, middleName, consumers && consumers[0] ? consumers[0].cons_full_name : null);
    await sendEmail(email, text);
    return {code, codeId: confirmCode._id};
};

exports.updateConsumer = async (subLogin, _id, name) => {
    const consumer = await Consumer.findOne({_id, user: subLogin.user._id}).populate({path: 'ssdUri', model: 'ssd_uri', select: 'name email uri'});
    if (!consumer) throw notFound('Консамер не найден');
    if (!consumer.ssdUri) throw conflict('Консалмер имеет некорректный источник данных');
    consumer.name = name;
    await consumer.save();
    return {message: 'ok'};
};

exports.putConsumerConfirm = async (subLogin, codeId, code) => {
    if (!code) throw badRequest('Введите код подтверждения');
    const confirmCode = await ConfirmCode.findOne({_id: codeId, code});
    if (!confirmCode) throw badRequest('Код некорректный');
    const {consumers, email, ssdUri, regionId} = confirmCode;
    const ssd = await SsdUri.findById(ssdUri);
    const cons_UIDs = [];
    const cons = [];
    // const {consumers_lkp = []} = await qConsumerIdentityCode(consumers.map(c => c.cons_uid), ssd.uri);
    // const consumersObject = {};
    // for (const c of consumers_lkp) {
    //     consumersObject[c.cons_uid] = c;
    // }
    const resultConsumers = [];
    for (const c of consumers) {
        // if (consumersObject[c.cons_uid] && consumersObject[c.cons_uid].lkp === c.lkp) 
        if ((() => {return true;})())
            resultConsumers.push(c.cons_uid);
        else {
            try {
                await qConsumerConnectionLK(false, c.cons_uid, ssd.uri, email);
            } catch (err) {
                console.error(err);
            }
        }
    }
    for (const consumer of consumers) {
        console.log('CONSUMER', consumer);
        const {cons_inn, cons_kpp, cons_uid, cons_full_name, lkp} = consumer;
        if (cons_uid && resultConsumers.includes(cons_uid)) {
            cons_UIDs.push(cons_uid);
            const consumerExists = await Consumer.findOne({cons_UID: cons_uid, user: subLogin.user._id});
            if (consumerExists) throw conflict('Потребитель с такими ИНН и КПП уже зарегистрирован');
            const c = await Consumer({
                user: subLogin.user._id,
                cons_inn, 
                cons_kpp,
                email,
                cons_UID: cons_uid,
                cons_full_name,
                lkp,
                ssdUri
            }).save(); 
            await NotificationController.update(subLogin, cons_uid, [subLogin.user.email], [], true, false);
            try {
                await qConsumerConnectionLK(true, cons_uid, ssd.uri, email);
            } catch (err) {
                console.error(err);
            }
            cons.push(c);
        }
    }
    await SubLogin.updateOne({_id: subLogin._id}, {$addToSet: {consumers: {$each: cons_UIDs}}});
    await User.updateOne(
      { _id: subLogin.user._id },
      { $set: { regionId: ssd.regionId } }
    );
    return {
        consumers: cons
    };
};

exports.deleteConsumer = async (subLogin, cons_UID) => {
    const consumer = await exports.getConsumerByConsUid(subLogin, cons_UID);
    await NotificationController.update(subLogin, cons_UID, [], []);
    await SubLogin.updateMany({user: subLogin.user._id}, {$pull: {consumers: cons_UID}});
    await Consumer.deleteOne({cons_UID, user: subLogin.user._id});
    const ssdUri = await SsdUri.findById(consumer.ssdUri);
    try {
        const countConsumers = await Consumer.countDocuments({cons_UID});
        const needRemove = countConsumers ? false : true;
        await qConsumerConnectionLK(false, cons_UID, ssdUri ? ssdUri.uri : null, consumer.email, needRemove);
    } catch (err) {
        console.error(err);
    }
    return {message: 'ok'};
};

exports.getConsumerByConsUid = async (subLogin, cons_UID) => {
    const consumer = await Consumer.findOne({cons_UID, user: subLogin.user._id});
    if (!consumer || !consumer.cons_UID) throw notFound('Контрагент не найден');
    try {
        const cons = await qPromConsumerInfo(consumer.cons_UID);
        cons.email = consumer.email;
        cons.consumer = consumer;
        return cons;
    } catch (err) {
        console.error(err);
        return {consumer};
    }
};

exports.getConsumerById = async (_id) => {
    const consumer = await Consumer.findById(_id).populate({path: 'ssdUri', model: 'ssd_uri', select: 'name email uri'}).lean();
    if (!consumer) throw notFound('Consumer not found');
    const [user, subLogin] = await Promise.all([
        User.findById(consumer.user),
        SubLogin.findOne({user: consumer.user, type: 'admin'})
    ]);
    consumer.user = user;
    consumer.subLogin = subLogin;
    try {
        consumer.fullInfoConsumer = await qPromConsumerInfo(consumer.cons_UID, getSsdUriByConsumer(consumer));
    } catch (err) {
        console.error(err);
    }
    return {consumer};
};

exports.createSubLogin = async (subLogin, login, type, firstName, lastName, middleName, tabs, roleIds, front_uri, position, consumers, contracts) => {
    if (type && type === 'admin') throw badRequest('type не может быть равным admin');
    checkLogin(login); 
    const targetSubLogin = await SubLogin.findOne({login});
    if (targetSubLogin) throw conflict('Логин уже занят');
    if (tabs) {
        for (const tab of tabs) {
            const checkTabsResult = await checkTab(tab);
            if (!checkTabsResult) throw badRequest('Введите корректные данные для вкладок');
        }
    }
    const str = uuid.v1();
    login = login.toLowerCase().trim();
    const newRole = await SubLogin({
        login,
        type,
        password: null,
        roleIds,
        user: subLogin.user._id,
        rights: [],
        blocked: false,
        firstName,
        lastName,
        contracts,
        authLink: {
            str,
            date: new Date()
        },
        middleName,
        tabs,
        position
    }).save();
    if (front_uri) {
        const text = `Вам отправлено приглашение на подключение к ЛКЮЛ МРГ Москва от Пользователя ЛКЮЛ ${subLogin.firstName} ${subLogin.lastName} ${subLogin.middleName} ${subLogin.position || subLogin.type} ${subLogin.login}.
Для регистрации в ЛКЮЛ необходимо перейти по ссылке (ниже), придумать пароль и авторизироваться в ЛКЮЛ.

${front_uri}/sub_logins/reset/${str}

Письмо сформировано автоматически, отвечать на него не нужно.
Если Вы получили письмо ошибочно, то никаких действий осуществлять нет необходимости.`;
        await sendEmail(login, text, 'Приглашение в личный кабинет юридических лиц МРГ Москва');
    }
    await updateSubLoginConsumers(subLogin, newRole, consumers);
    return {newRole};
};

exports.updatePasswordByLink = async ({str, password, repeatPassword}) => {
    const subLogin = await SubLogin.findOne({'authLink.str': str, 'authLink.date': {$gte: moment().add(-1, 'day')}});
    if (!subLogin) throw unauthorized('Сыылка неверна или недействительна');
    if (password) {
        checkPassword(password, repeatPassword);
        const hash = await auth.hashPassword(password);
        await SubLogin.updateOne({_id: subLogin._id}, {$set: {password: hash, authLink: {str: null, date: null}}});
        return {message: 'ok'};
    }
    return {message: 'ok'};
};

exports.giveRoleTypeToSubLogin = async (subLoginId, types) => {
    if (!types) throw badRequest('Types - массив ролей');
    const subLogin = await exports.subLoginById(subLoginId);
    const roles = await Role.find({type: {$in: types}});
    if (roles.length !== types.length) throw badRequest('Роль не найдена');
    if (types.length) subLogin.tabs = tabsIntersection(roles);
    subLogin.roles = types;
    await subLogin.save();
    return {message: 'ok'};
};

exports.updateSubLoginOfAdmin = async (subLoginId, essences, tabs = [], roleIds) => {
    const updatingSubLogin = await SubLogin.findOne({_id: subLoginId});
    if (!subLoginId) throw notFound('Сублогин не найден');
    for (const index in essences) {
        updatingSubLogin[index] = essences[index];
    }
    if (tabs) {
        for (const tab of tabs) {
            const checkTabsResult = await checkTab(tab);
            if (!checkTabsResult) throw badRequest('Введите корректные данные для вкладок');
        }
        updatingSubLogin.tabs = tabs;
    }
    if (roleIds) {
        updatingSubLogin.roleIds = roleIds;
    }
    await updatingSubLogin.save();
    return updatingSubLogin;
};

const updateSubLoginConsumers = async (admin, updatingSubLogin, consumers = []) => {
    const newConsumers = consumers.filter(c => !updatingSubLogin.consumers.includes(c));
    for (const c of newConsumers) {
        if (admin.type !== 'admin' && admin.type !== 'curator' &&!admin.consumers.includes(c)) throw forbidden('У вас нет доступа к выбранным потребителям');
        await NotificationController.update(updatingSubLogin, c, [updatingSubLogin.login], [], true, false);
    }
    const deletedConsumers = updatingSubLogin.consumers.filter(c => !consumers.includes(c));
    for (const c of deletedConsumers) await NotificationController.update(updatingSubLogin, c, [], [], false, false);
    updatingSubLogin.consumers = consumers;
    await updatingSubLogin.save();
};

exports.updateSubLogin = async (subLogin, subLoginId, type, essences = {}, blocked = null, firstName, lastName, middleName, tabs = [], position, roleIds, regionId) => {
    const updatingSubLogin = await SubLogin.findOne({_id: subLoginId}).populate('user');
    if (!regionId) {
      regionId = updatingSubLogin.user.regionId;
    }
    if (type && type !== updatingSubLogin.type && type === 'admin') throw badRequest('type не может быть равным admin');
    for (const index in essences) {
        if (index === 'consumers') {
            await updateSubLoginConsumers(subLogin, updatingSubLogin, essences[index]);
            // const newConsumers = essences[index].filter(c => !updatingSubLogin[index].includes(c));
            // for (const c of newConsumers) await NotificationController.update(updatingSubLogin, c, [updatingSubLogin.login], [], true, false);
            // const deletedConsumers = updatingSubLogin[index].filter(c => !essences[index].includes(c));
            // for (const c of deletedConsumers) await NotificationController.update(updatingSubLogin, c, [], [], false, false);
        } else updatingSubLogin[index] = essences[index];
    }
    if (blocked === true || blocked === false) {
        updatingSubLogin.blocked = blocked;
    }
    if (roleIds) updatingSubLogin.roleIds = roleIds;
    if (updatingSubLogin.type !== 'admin' && type || type === '') updatingSubLogin.type = type;
    if (firstName || firstName === '') updatingSubLogin.firstName = firstName;
    if (lastName || lastName === '') updatingSubLogin.lastName = lastName;
    if (middleName || middleName === '') updatingSubLogin.middleName = middleName;
    if (tabs) {
        for (const tab of tabs) {
            const checkTabsResult = await checkTab(tab);
            if (!checkTabsResult) throw badRequest('Введите корректные данные для вкладок');
        }
        updatingSubLogin.tabs = tabs;
    }
    if (position || position === '') updatingSubLogin.position = position;
    await User.updateOne({ _id: updatingSubLogin.user._id }, { $set: { regionId } });
    await updatingSubLogin.save();
    return updatingSubLogin;
};

exports.subLoginList = async (subLogin) => {
    const subLogins = await SubLogin.find({user: subLogin.user._id, type: {$ne: 'admin'}});
    return subLogins;
};

exports.subLoginById = async (subLoginId) => {
    const subLogin = await SubLogin.findOne({_id: subLoginId});
    if (!subLogin) throw notFound('Сублогин не найден');
    return subLogin;
};

exports.deleteSubLogin = async (subLoginId, subLogin) => {
    const targetSubLogin = await exports.subLoginById(subLoginId);
    if (targetSubLogin.type === 'admin') throw conflict('Админ не может быть удален');
    if (subLogin && String(subLogin.user._id) !== String(targetSubLogin.user)) throw conflict('Сублогин не принадлежит данному пользователю');
    await NotificationController.update(subLogin, null, [], []);
    await SubLogin.deleteOne({_id: targetSubLogin._id});
    const text = `Ваша учетная запись почта в Личном кабинете для юридических лиц удалена Администратором Вашего ЛК ${subLogin.firstName} ${subLogin.lastName} ${subLogin.middleName} ${subLogin.login}.
За подробной информацией обратитесь к Администратору Вашего ЛКЮЛ.`;
    await sendEmail(targetSubLogin.login, text, 'Учетная запись удалена');
    return {message: 'ok'};
};

exports.changePassword = async (subLogin, password, repeatPassword, subLoginId) => {
    if (!subLogin && !subLoginId) throw unauthorized('Ошибка авторизации');
    checkPassword(password, repeatPassword);
    const hash = await auth.hashPassword(password);
    await SubLogin.updateOne({_id: subLogin ? subLogin._id : subLoginId}, {$set: {password: hash}});
    await UserTokenActivity.deleteOne({user: subLogin._id});
    return {message: 'Пароль изменен'};
};

exports.resetPassword = async (login) => {
    login = login.toLowerCase().trim();
    const subLogin = await SubLogin.findOne({login});
    if (!subLogin) throw unauthorized('Пользователь с таким Email не найден');
    const code = await generateDigitalPassword();
    const confirmCode = await ConfirmCode({code, email: subLogin.login}).save();
    const {firstName, lastName, middleName} = subLogin;
    const text = sendEmailText(code, login, firstName, lastName, middleName, null);
    await sendEmail(subLogin.login, text);
    return {codeId: confirmCode._id, code};
};

exports.checkCode = async (codeId, code) => {
    const confirmCode = await ConfirmCode.findOne({_id: codeId});
    if (!confirmCode || !confirmCode.code || !code || confirmCode.code !== code) throw unauthorized('Неверный код');
    return {message: 'ok'};
};

exports.resetPasswordConfirm = async (codeId, code, password, repeatPassword) => {
    const confirmCode = await ConfirmCode.findOne({_id: codeId});
    if (!confirmCode || !confirmCode.code || !code || confirmCode.code !== code) throw unauthorized('Неверный код');
    const subLogin = await SubLogin.findOne({login: confirmCode.email});
    if (!subLogin) throw unauthorized('Пользователь с таким Email не найден');
    await checkPassword(password, repeatPassword);
    const hash = await auth.hashPassword(password);
    subLogin.password = hash;
    await subLogin.save();
    await ConfirmCode.deleteOne({_id: codeId});
    return {message: 'ok'};
};

exports.loginSBIS = async (data) => {
    const {login, password} = data;
    return loginSBIS(login, password)
        .then(({result}) => {
            return {session: result};
        });
};

exports.sertificateList = async (sertList) => {
    const {result} = await sertificateList(sertList);
    return result;
};

exports.authBySert = async (sert) => {
    const result = await authBySert(sert);
    return result;
};

exports.getRoles = async (userId) => {
    const roleSettings = await Role.find({user: userId});
    return {roleSettings};
};

exports.createRoles = async (userId, type, tabs) => {
    const r = await Role.findOne({type: type, user: userId});
    if (r) throw conflict('Роль уже существует');
    for (const tab of tabs) {
        const checkTabsResult = await checkTab(tab);
        if (!checkTabsResult) throw badRequest('Введите корректные данные для вкладок');
    }
    const roleSetting = await Role({
        user: userId,
        type,
        tabs
    }).save();
    return roleSetting;
};

exports.updateRoles = async (userId, _id, tabs) => {
    const r = await exports.getRoleById(userId, _id);
    if (tabs) {
        for (const tab of tabs) {
            const checkTabsResult = await checkTab(tab);
            if (!checkTabsResult) throw badRequest('Введите корректные данные для вкладок');
        }
        r.tabs = tabs;
    }
    await r.save();
    return {message: 'ok'};
};

exports.getRoleById = async (userId, _id) => {
    const role = await Role.findOne({user: userId, _id});
    if (!role) throw notFound('Роль не найдена');
    return role;
};

exports.getRoleByType = async (type) => {
    const role = await Role.findOne({type});
    if (!role) throw notFound('Роль не найдена');
    return role;
};

exports.deleteRoles = async (userId, _id) => {
    await exports.getRoleById(userId, _id);
    await Role.deleteOne({user: userId, _id});
    return {message: 'ok'};
};

exports.getInfo = async (role) => {
    return role;
};

exports.createNotice = async (subLogin, message, type) => {
    await Notice({
        message,
        user: subLogin.user._id,
        viewedSubLogins: [],
        type
    }).save();
    return {message: 'ok'};
};

exports.getNotices = async (subLogin, all = null) => {
    const query = {user: subLogin.user._id};
    if (all !== 'true') query.viewedSubLogins = {$ne: subLogin._id};
    const notices = await Notice.find(query);
    return {notices};
};

exports.getNoticeById = async (subLogin, noticeId) => {
    const notice = await Notice.updateOne({_id: noticeId, user: subLogin.user._id}, {$addToSet: {viewedSubLogins: subLogin._id}});
    if (!notice) throw notFound('Notice not found');
    return {notice};
};

exports.expireAllUserTokens = async () => {
    await UserTokenActivity.deleteMany({ user: { $exists: true } });
    return true;
}