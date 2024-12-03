const jwt = require('../libs/jwt');
const {Curator, Appeal} = require('../models');
const {unauthorized, conflict, notFound} = require('boom');
const findAllByConsShortNameAndConsINN = require('../requests/findAllByConsShortNameAndConsINN');
const pagination = require('../libs/pagination');
const Consumer = require('../models/Consumer');
const SubLogin = require('../models/SubLogin');
const User = require('../models/User');
const sendEmail = require('../libs/sendEmail');
const {checkPassword, existsMany} = require('../libs/checkValidation');
const { getSsdUriByConsumer } = require('../libs/getSsdUriByConsumer');
const paginate = require('../libs/paginate');
const PromisePool = require('@supercharge/promise-pool');
const _ = require('lodash');

exports.createCurator = async (login, password, repeatPassword, position, email, phone, blocked = false, tabs, firstName, lastName, middleName, regionId) => {
    checkPassword(password, repeatPassword);
    const queries = [{login}];
    if (email) queries.push({email});
    if (phone) queries.push({phone});
    const existsCurator = await Curator.findOne({$or: queries});
    if (existsCurator) throw conflict('Куратор с такими данными уже существует');
    const hash = await jwt.sign(password);
    await Curator({
        password: hash,
        login,
        position,
        email,
        phone,
        blocked,
        tabs,
        firstName,
        middleName,
        lastName,
        regionId
    }).save();
    return {message: 'ok'};
};

exports.getListOfCurators = async (position, sort, name, limit, page, email, regionId) => {
    limit = limit ? parseInt(limit) : 20;
    page = page ? parseInt(page) : 1;
    if (!page || page < 1) page = 1;
    if (!limit || limit < 1) limit = 20;
    const query = {};
    if (regionId) query.regionId = regionId;
    if (position) query.position = new RegExp(position, 'gi');
    if (name) {
        const names = name.split(' ');
        query.$or = [];
        for (let name of names) {
            name = new RegExp(name, 'gi');
            query.$or.push(...[{firstName: name}, {lastName: name}, {middleName: name}]);
        }
    }
    if (email) {
        query.email = email;
    }
    const sorting = {createdAt: 1};
    if (sort === 'createdAt_desc') sorting.createdAt = -1;
    const [curators, count] = await Promise.all([
        Curator.find(query).sort(sorting).limit(limit).skip(limit * (page - 1)).lean(),
        Curator.countDocuments(query)
    ]);
    for (const curator of curators) {
        try {
            curator.password = await jwt.decodeToken(curator.password);
        } catch (err) {
            curator.password = 'смените этот пароль';
        }
    }
    return {curators, count};
};

exports.getCuratorById = async (_id) => {
    const curator = await Curator.findById(_id);
    if (!curator) throw notFound('Curator not found');
    try {
        curator.password = await jwt.decodeToken(curator.password);
    } catch (err) {
        curator.password = 'смените этот пароль';
    }
    return {curator};
};

exports.updateManyCurators = async (ids, tabs, blocked) => {
    const curators = await Curator.find({_id: {$in: ids}});
    if (curators.length !== ids.length) throw notFound('Кураторы не найдены');
    await Curator.updateMany({_id: {$in: ids}}, {$set: {tabs, blocked}});
    return {message: 'ok'};
};

exports.deleteManyCurators = async (ids) => {
    for (const _id of ids)
        await Curator.deleteOne({_id});
    return {message: 'ok'};
};

exports.updateCuratorById = async (_id, position, email, phone, password, repeatPassword, blocked, tabs, firstName, lastName, middleName, login, regionId) => {
    const {curator} = await exports.getCuratorById(_id);
    const data = {};
    const queries = [];
    if (position || position === '') data.position = position;
    if ((email || email === '') && email !== curator.email) {
        if (email) queries.push({email});
        data.email = email;
    }
    if ((phone || phone === '') && phone !== curator.phone) {
        if (phone) queries.push({phone});
        data.phone = phone;
    }
    if (password && repeatPassword) {
        checkPassword(password, repeatPassword);
        const hash = await jwt.sign(password);
        data.password = hash;
    }
    if (blocked === true || blocked === false) data.blocked = blocked;
    if (firstName || firstName === '') data.firstName = firstName;
    if (lastName || lastName === '') data.lastName = lastName;
    if (middleName || middleName === '') data.middleName = middleName;
    if (tabs) data.tabs = tabs;
    if (regionId) data.regionId = regionId;
    await existsMany(queries, Curator);
    await Curator.updateOne({_id}, {$set: data});
    if (login && login !== curator.login) {
        const existsCurator = await Curator.findOne({login}, {_id: 1}).lean();
        if (existsCurator) throw conflict('Куратор с таким логином уже существует');
        await Curator.updateOne({_id}, {$set: {login}});
    }
    return {message: 'ok'};
};

exports.deleteCurator = async (_id) => {
    await exports.getCuratorById(_id);
    await Curator.deleteOne({_id});
    return {message: 'ok'};
};

exports.login = async (login, password) => {
    login = new RegExp(`^${login}$`, 'gi');
    const curator = await Curator.findOne({login});
    if (!curator) throw unauthorized('Проверьте правильность ввода логина и пароля');
    if (curator.blocked) throw unauthorized('Пользователь заблокирован обратитесь к Web-администратору ЛКЮЛ');
    const pass = await jwt.decodeToken(curator.password);
    if (pass !== password) throw unauthorized('Проверьте правильность ввода логина и пароля');
    const token = await jwt.sign({_id: curator._id});
    return {
        token,
        _id: curator._id,
    };
};

exports.getCuratorInfo = async (curator) => {
    try {
        curator.password = await jwt.decodeToken(curator.password);
    } catch (err) {
        curator.password = 'смените этот пароль';
    }
    return curator;
    // const result = await ssdRequest(null, 'qCuratorInfo', null, {cur_email: curator.email});
    // return result;
};

exports.getConsumersList = async (_curator, page = 0, limit = 20, cons_inn, cons_short_name, userName, sortBy, desc, cons_UIDs = [], lkp, cons_kpp, regionId, isShowBroken = false) => {
    page = parseInt(page);
    limit = parseInt(limit);
    
    let countRes = 0;
    let allConsumersCount = 0;
    const maxCount = limit * (page + 1);

    const query = {};
    if (userName) {
        const reg = new RegExp(userName, 'gi');
        const query = {$or: [{firstName: reg}, {lastName: reg}, {middleName: reg}]};
        const users = await User.find(query, {_id: 1}).lean();
        query.user = {$in: users.map(u => u._id)}
    }
    if (cons_UIDs.length) {
        query.cons_UID = {$in: cons_UIDs}
    }
    const consumers = await Consumer.find(query).populate('ssdUri');

    let brokenConsumers = {};
    let uniqueConsumers = {};

    for (const consumer of consumers) {
        const uri = getSsdUriByConsumer(consumer);

        if (!regionId) {
          if (!uri) {
            if (isShowBroken) {
              if (countRes + 1 >= maxCount) {
                  continue;
              }
              countRes += 1;
              allConsumersCount += 1;
              brokenConsumers[consumer._doc.cons_UID] = {
                ...consumer._doc,
                cons_INN: consumer._doc.cons_inn,
                cons_KPP: consumer._doc.cons_kpp,
                broken: true,
              };
            }
          } else {
            consumer.uri = uri;
            consumer.regionId = consumer.ssdUri.regionId;
            uniqueConsumers[consumer.cons_UID] = consumer;
          }
        }
        if (
          consumer.ssdUri &&
          consumer.ssdUri &&
          regionId &&
          consumer.ssdUri.regionId.toString() == regionId.toString()
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

    const { results, errors } = await PromisePool
        .withConcurrency(5)
        .for(Object.values(consumersBySsd))
        .process(async (consumers) => {
            const uri = consumers[0].uri;
            const cons_UIDsList = consumers.map(c => c.cons_UID);
            const data = await findAllByConsShortNameAndConsINN(null, uri, page, limit, cons_inn, cons_short_name, cons_UIDsList, sortBy, desc, lkp, cons_kpp);
            if (!data) {
                return [];
            }

            const content = data.consumers;
            const count = data['item-total'];
            allConsumersCount += count;

            if (!content) {
                throw conflict(`Некорректный ССД: ${uri}`);
            }
            for (const c of content) {
                c.broken = false;
                c.consumers = await Consumer.find({cons_UID: c.cons_UID}).populate({model: 'user', path: 'user', select: '_id email blocked position'}).lean();
                c.regionId = consumers[0].regionId;
                const userIds = [];
                for (const cons of c.consumers) {
                    if (cons.user) {
                        cons.subLoginAdmin = await SubLogin.findOne({user: cons.user._id, type: 'admin'}, {password: 0});
                        userIds.push(cons.user._id);
                    }
                } 
                const termOfUse = await SubLogin.countDocuments({user: {$in: userIds}, termOfUse: true});
                
                c.termOfUse = termOfUse ? true : false;
                c.countNewAppeals = await Appeal.countDocuments({state: {$ne: 'Принято'}, direction: 'outgoing', cons_UID: c.cons_UID});
            }
            return content.filter((c) => {
                if (countRes + 1 >= maxCount) {
                    return false;
                }

                countRes += 1;
                return !c.broken;
            });
        });

    const allFineConsumers = _.flatten(results);
    const allConsumers = [...Object.values(brokenConsumers), ...allFineConsumers];

    return {
      payload: {
        consumers: allConsumers,
        pagination: pagination(limit, page, allConsumersCount),
      },
      errors: errors,
    };
};


exports.sendNotificationByCurator = async (userIds = [], cons_UIDs = [], type, text, allUsers = false, allConsumers = false, regionId) => {
    if ((userIds && userIds.length) || allUsers) {
        const query = {regionId};
        if (!allUsers && userIds && userIds.length) query._id = {$in: userIds};
        const users = await User.find(query, {email: 1});
        for (const user of users) {
            await sendEmail(user.email, text, type);
        }
    }
    if ((cons_UIDs && cons_UIDs.length) || allConsumers) {
        // TODO возможно нужно отправлять по региону
        const query = {};
        if (!allConsumers && cons_UIDs && cons_UIDs.length) query.cons_UID = {$in: cons_UIDs};
        const consumers = await Consumer.find(query);
        const consumerObject = {};
        for (const consumer of consumers) {
            if (consumerObject[consumer.cons_UID]) continue;
            consumerObject[consumer.cons_UID] = 1;
            await sendEmail(consumer.email, text, type);
        }
    }
    return {message: 'ok'};
};
