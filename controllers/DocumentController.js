/* eslint-disable no-console */
const {notFound, conflict, badRequest} = require('boom');
const {baseUri, receiver} = require('../config');
const {receiver_name, receiver_inn, receiver_kpp} = receiver;
const {Consumer, Question, Template, ConsumerNotification, New, SsdUri, Email} = require('../models');
const { getBlockThemeById } = require('./BlockThemeController');
const createDocument = require('../sbis/createDocument');
const getDocumentListByFolders = require('../sbis/getDocumentsListByFolders');
const getDocumentList = require('../sbis/getDocumentList');
const deleteDocument = require('../sbis/deleteDocument');
const removeDocument = require('../sbis/removeDocument');
const createAttachment = require('../sbis/createAttachment');
const base64gen = require('../libs/base64gen');
const {getSsdUriByConsumer} = require('../libs/getSsdUriByConsumer')
const prepareSendToSignDocument = require('../sbis/prepareSendToSignDocument');
const sendToSignDocument = require('../sbis/SendToSignDocument');
const approveDocument = require('../sbis/approveDocument');
const getDocument = require('../sbis/getDocument');
const changeListSbis = require('../sbis/changeListSbis');
const prepareCancellation = require('../sbis/prepareCancellation');
const cancellation = require('../sbis/cancellation');
const deviation = require('../sbis/deviation');
const prepareDeviation = require('../sbis/prepareDeviation');
const qPromConsumerContractInfo = require('../requests/qPromConsumerContractInfo');
const HH_MM_SS_FORMAT_TEG_EXP = /(?:\d|2[0-3]):(?:[0-5]\d):(?:[0-5]\d)/;
const pagination = require('../libs/pagination');
const sendEmail = require('../libs/sendEmail');
const getFileByUri = require('../sbis/getFileByUri');
const ObjectId = require('mongoose').Types.ObjectId;

const moment = require('moment');

const SBIS_DIRECTION = {
    'Входящий': 'incomingDocuments',
    'Исходящий': 'documents',
    'Внутренний': 'documents'
};

const SBIS_TYPES = ['ДоговорИсх', 'ДоговорВх', 'ФактураИсх', 'ФактураВх', 'СчетИсх', 'СчетВх', 'ДокОтгрИсх', 'ДокОтгрВх', 'КоррИсх', 'КоррВх'];
// const SBIS_REESTR = ['Входящие', 'Отправленные', 'Ответы контрагента'];

const {Document, DocumentHistory, ChangeList, Appeal, SubLogin, TermOfUse, Curator} = require('../models');
const qPromConsumerInfo = require('../requests/qPromConsumerInfo');
const ConsumerNotificationView = require('../models/ConsumerNotificationView');
const qGetDocInform = require('../requests/qGetDocInform');
const REGISTER_TYPES = ['Входящие', 'Отправленные', 'Ответы контрагента'];

const createHistory = async (subLogin, contr_UID, state, doc_uid) => {
    return DocumentHistory({
        cons_UID: subLogin.cons_UID,
        contr_UID,
        user: subLogin.user._id,
        subLogin: subLogin._id,
        state,
        doc_uid
    }).save();
};

exports.getAdminEmails = async () => {
    const emails = await Email.findOne();
    return emails;
};

exports.createConsumerNotification = async (cons_UIDs, type, text, userIds = [], allConsumers = false, regionId) => {
    if (allConsumers && !regionId) {
        const conses = await Consumer.aggregate([{$group: {_id: '$cons_UID'}}]);
        cons_UIDs = conses.map(c => c._id);
    }
    if (allConsumers && regionId) {
        const conses = await Consumer.find({}).populate('ssdUri');
        cons_UIDs = []

        for (const c of conses) {
            if (!c.ssdUri){
                continue;
            }
            if (!c.ssdUri.regionId) {
                continue;
            }
            if (regionId.toString() !== c.ssdUri.regionId.toString()) {
                continue;
            }
            cons_UIDs.push(c.cons_UID);
        }
    }
    let normType = '';
    if (type === 'met_blocking') {
        normType = 'Блокировка передачи показаний/расхода';
    }
    await ConsumerNotification({
        cons_UIDs,
        allConsumers,
        type: normType || type,
        text,
        sended: type === 'met_blocking' ? true : false,
        users: userIds,
        regionId,
    }).save();
    return {message: 'ok'};
};

exports.getConsumerNotifications = async (page, limit, regionId) => {
    limit = limit ? parseInt(limit) : 20;
    page = page ? parseInt(page) : 1;
    if (!limit || limit < 1) limit = 20;
    if (!page || page < 1) page = 1;

    const query = {};
    if (regionId) {
      query.regionId = regionId;
    }

    const consumerNotifications = await ConsumerNotification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(limit * (page - 1))
      .lean();
    const consumerNotificationsCount =
      await ConsumerNotification.countDocuments(query);

    return {
      count: consumerNotificationsCount,
      consumerNotifications: consumerNotifications,
    };
};

exports.deleteConsumerNotification = async (consumerNotificationId) => {
    await Promise.all([
        ConsumerNotification.deleteOne({_id: consumerNotificationId}),
        ConsumerNotificationView.deleteMany({consumerNotification: consumerNotificationId})
    ]);
    return {message: 'ok'};
};

exports.getConsumerNotificationsOfUser = async (subLogin, new_n, page, limit) => {
    page = page ? parseInt(page) : 1;
    limit = limit ? parseInt(limit) : 20;
    if (!limit || limit < 1) limit = 20;
    if (!page || page < 1) page = 1;
    const skip = (page - 1) * limit;
    const {cons_UID} = subLogin;
    const query = {
      cons_UIDs: { $in: [cons_UID] },
      createdAt: { $gte: subLogin.createdAt },
      $or: [
        { "users.0": { $exists: false } },
        { users: { $in: [String(subLogin.user._id)] } },
      ],
    };
    const newCountQuery = {
      cons_UIDs: { $in: [cons_UID] },
      createdAt: { $gte: subLogin.createdAt },
      $or: [
        { "users.0": { $exists: false } },
        { users: [String(subLogin.user._id)] },
      ],
    };
    const [viewedConsumerNotification] = await ConsumerNotificationView.aggregate([{$match: {viewed: true, subLogin: subLogin._id}}, {$group: {_id: null, consumer_notifications: {$push: '$consumerNotification'}}}]);
    if (viewedConsumerNotification) {
      const mappedConsumerNotifications =
        viewedConsumerNotification.consumer_notifications.map((n) =>
          ObjectId(n)
        );
      if (new_n === "true") query._id = { $nin: mappedConsumerNotifications };
      newCountQuery._id = { $nin: mappedConsumerNotifications };
    }
    let docNewCount = 0;
    const [consumerNotifications, count, newCount] = await Promise.all([
        ConsumerNotification.find(query).limit(limit).skip(skip).sort({createdAt: -1}).lean(),
        ConsumerNotification.countDocuments(query),
        ConsumerNotification.countDocuments(newCountQuery),
    ]);

    for (const c of consumerNotifications) {
        if (c.doc_name) {
            if (HH_MM_SS_FORMAT_TEG_EXP.test(c.doc_name)) {
                c.doc_name = c.doc_name.slice(0, c.doc_name.search(HH_MM_SS_FORMAT_TEG_EXP) - 1) + c.doc_name.slice(c.doc_name.search(HH_MM_SS_FORMAT_TEG_EXP) + 9);
            }
        }
        c.data = {viewed: false};
        const viewed = await ConsumerNotificationView.findOne({consumerNotification: c._id, subLogin: subLogin._id});
        if (viewed && viewed.viewed) {
            c.data.viewed = true;
        } else {
            if (c.doc_uid) {
                docNewCount++;
            }
        }
    }
    return {consumerNotifications, count, docNewCount, newCount};
};

exports.viewedAllConsumerNotification = async (subLogin) => {
    const [viewedConsumerNotification] = await ConsumerNotificationView.aggregate([{$match: {viewed: true, subLogin: subLogin._id}}, {$group: {_id: null, consumer_notifications: {$push: '$consumerNotification'}}}]);
    const query = {cons_UIDs: subLogin.cons_UID, $or: [{'users.0': {$exists: false}}, {users: subLogin.user._id}]};
    if (viewedConsumerNotification) query._id = {$nin: viewedConsumerNotification.consumer_notifications};
    const consumerNotifications = await ConsumerNotification.find(query, {_id: 1});
    for (const cn of consumerNotifications) {
        const cnv = await ConsumerNotificationView.findOne({consumerNotification: cn._id, subLogin: subLogin._id}).lean();
        if (!cnv) await ConsumerNotificationView({
            consumerNotification: cn._id,
            subLogin: subLogin._id,
            user: subLogin.user._id,
            viewed: true
        }).save();
        else {
            await ConsumerNotificationView.updateOne({_id: cnv._id}, {$set: {viewed: true}});
        }
    }
    return {message: 'ok'};
};

exports.getConsumerNotificationOfUserById = async (subLogin, consumerNotificationId) => {
    const consumerNotification = await ConsumerNotification.findOne({_id: consumerNotificationId}).lean();
    if (!consumerNotification) throw notFound('Уведомление не найдено');
    consumerNotification.consumers = await Consumer.find({cons_UID: {$in: consumerNotification.cons_UIDs}});
    const query = {subLogin: subLogin._id, consumerNotification: consumerNotification._id};
    if (subLogin && subLogin.user && subLogin.user._id) {
        query.user = subLogin.user._id;
    }
    const consumerNotificationView = await ConsumerNotificationView.findOne(query);
    if (!consumerNotificationView) {
        query.viewed = true;
        await ConsumerNotificationView(query).save();
    }
    await ConsumerNotificationView.updateOne(query, {$set: {viewed: true}});
    return {consumerNotification};
};

exports.createTemplate = async (text, type, regionId) => {
    if (!type || !text) throw badRequest('Введите type и text');
    const template = await Template.findOne({type});
    if (template) throw conflict('С таким типом шаблон уже есть');
    await Template({
        text,
        type,
        regionId
    }).save();
    return {message: 'ok'};
};

exports.getTemplates = async (limit, page, regionId) => {
    limit = limit ? parseInt(limit) : 20;
    page = page ? parseInt(page) : 1;
    if (!limit || limit < 1) limit = 20;
    if (!page || page < 1) page = 1;

    const query = {}
    if (regionId) {
        query.regionId = regionId
    }

    const [templates, count] = await Promise.all([
        Template.find(query, {text: 1, type: 1, regionId: 1}).limit(limit).skip(limit * (page - 1)),
        Template.countDocuments(query)
    ]);
    return {count, templates};
};

exports.updateTemplate = async (_id, type, text, regionId) => {
    const template = await Template.findById(_id);
    if (type && type !== template.type) {
        const existsTemplate = await Template.findOne({type});
        if (existsTemplate) throw conflict('С таким типом шаблон уже есть');
        template.type = type;
    }
    if (text || text === '') template.text = text;
    if (regionId) template.regionId = regionId;
    await template.save();
    return {message: 'ok'};
};

exports.deleteTemplate = async (_id) => {
    await Template.deleteOne({_id});
    return {message: 'ok'};
};

exports.getQuestions = async (category, regionId, isAllThemes = false) => {
  const query = {};
  if (regionId) {
    query.$or = [
      { regionId: ObjectId(regionId) },
      { regionId: { $exists: false } },
    ];
  } else {
    query.regionId = { $exists: false };
  }
  
  if (isAllThemes) {
    delete query.$or;
    delete query.regionId;
  }

  if (category) {
    query.category = new RegExp(category, "gi");
  }

  const questions = await Question.aggregate([
    {
      $match: query,
    },
    {
      $group: {
        _id: "$category",
        questions: { $push: { _id: "$_id", text: "$text", answer: "$answer", regionId: "$regionId" } },
      },
    },
  ]);
  return { questions };
};

exports.createQuestion = (category, text, answer, regionId, isCreatedByAdmin, isCreatedBySuperadmin) => {
    return Question({
        category,
        answer,
        text,
        regionId,
        isCreatedByAdmin,
        isCreatedBySuperadmin
    }).save();
};

exports.getQuestionById = async (_id) => {
    const question = await Question.findById(_id);
    if (!question) throw notFound('Question not found');
    return {question};
};

exports.updateQuestion = async (_id, category, text, answer, regionId) => {
    await exports.getQuestionById(_id);
    const data = {};
    if (category) {
      data.category = category;
    }
    if (text) {
      data.text = text;
    }
    if (answer) {
      data.answer = answer;
    }
    if (regionId) {
      data.regionId = regionId;
    }
    return Question.updateOne({_id}, {$set: data});
};

exports.deleteQuestion = async (_id) => {
    await Question.deleteOne({_id});
    return {message: 'ok'};
};

exports.deleteQuestionCategory = async (category) => {
    await Question.deleteMany({category});
    return {message: 'ok'};
};

exports.confirmTermOfUse = async (subLogin) => {
    return SubLogin.updateOne({_id: subLogin._id}, {$set: {termOfUse: true}});
};

exports.getFIleByUri = async (uri, session) => {
    return new Promise((resolve, _reject) => {
        const cb = (filename) => resolve({data: filename});
        getFileByUri.download(uri, session, cb);
    });  
};

exports.checkTermOfUse = (_subLogin) => {
    return;
    // if (!subLogin.termOfUse) throw conflict('Примите пользовательское соглашение');
    // return;
};

exports.getTermOfUse = async () => {
    const term = await TermOfUse.findOne();
    if (!term) throw notFound('Term not found');
    return {fileName: term.fileName};
};

exports.createTermOfUse = async (fileName) => {
    if (!fileName) throw badRequest('Введите fileName');
    await TermOfUse.deleteMany();
    await TermOfUse({fileName}).save();
    return {message: 'ok'};
};

exports.appealList = async (subLogin, curator, page = 1, limit = 20, type = null, draft = 'false', direction, state, contr_num, states, deleted = false, search) => {
    limit = limit ? parseInt(limit) : 20;
    page = page ? parseInt(page) : 1;
    if (!limit || limit < 1) limit = 20;
    if (!page || page < 1) page = 1;
    const query = {deleted: {$ne: true}};
    if (deleted) query.deleted = true;
    if (subLogin) {
        query.cons_UID = subLogin.cons_UID;
        query.user = subLogin.user._id;
    }
    if (search) {
        const reg = new RegExp(search, 'gi');
        query.$or = [{
            title: reg
        }, {
            description: reg
        }];
    }
    if (curator) {
        // const {cons_UIDs} = await CuratorController.getConsumersList(curator);
        // if (!cons_UIDs.includes(curator.cons_UID)) throw badRequest('cons_UID не входит в список консамеров куратора');
        query.cons_UID = curator.cons_UID;
    }
    if (type) query.type = type;
    if (!direction) throw badRequest('Введите direction');
    query.direction = direction;
    if (contr_num) query.contr_num = contr_num;
    if (state) query.state = new RegExp(state, 'i');
    if (states) query.state = {$in: states};
    if (draft === 'true') {
        query.direction = curator ? 'incoming' : 'outgoing';
        query.draft = true;
    }
    const [appeals, total, curatorNewAppealsCount] = await Promise.all([
        Appeal.find(query).limit(limit).skip(limit * (page - 1)).populate('subLogin', '_id firstName lastName middleName type login').populate('blockTheme').sort({createdAt: -1}),
        Appeal.countDocuments(query),
        Appeal.countDocuments({state: {$ne: 'Принято'}, direction: 'outgoing', cons_UID: query.cons_UID})
    ]);
    return {
        appeals,
        pagination: pagination(limit, page, total),
        curatorNewAppealsCount
    };
};

exports.getAppealById = async (subLogin, curator, appealId) => {
    const query = {_id: appealId};
    const appeal = await Appeal.findOne(query).populate('user').populate('blockTheme').populate('subLogin', 'firstName lastName middleName blocked login type ').lean();
    if (!appeal) throw notFound('Не найдено обращение');
    if ((appeal.direction === 'outgoing' && curator) || (appeal.direction === 'incoming' && subLogin)) await Appeal.updateOne(query, {state: 'Принято'});
    if (appeal.appealCuratorEmail) {
        appeal.appealCurator = await Curator.findOne({email: appeal.appealCuratorEmail}).lean();
    }
    let predAppeal = appeal.appeal;
    let nextAppeal = appeal;
    const nextAppeals = [];
    const predAppeals = [];
    while (nextAppeal || predAppeal) {
        const [next, pred] = await Promise.all([
            nextAppeal ? Appeal.findOne({appeal: nextAppeal._id}).lean().populate('appealCurator') : null,
            predAppeal ? Appeal.findById(predAppeal).lean().populate('appealCurator') : null
        ]);
        if (next) {
            nextAppeals.unshift(next);
            nextAppeal = next || null;
        } else nextAppeal = null;
        if (pred) {
            predAppeals.push(pred);
            predAppeal = pred.appeal || null;
        } else predAppeal = null;
    }
    return {appeal, predAppeals, nextAppeals};
};

exports.deleteDraftAppeal = async (subLogin, curator, appealId) => {
    const query = {_id: appealId};
    if (subLogin) {
        query.user = subLogin.user._id;
        query.cons_UID = subLogin.cons_UID;
        query.direction = 'outgoing';
    }
    if (curator) {
        query.cons_UID = curator.cons_UID;
        query.direction = 'incoming';
    }
    const appeal = await Appeal.findOne(query);
    if (!appeal) throw notFound('Draft not found');
    await Appeal.updateOne(query, {$set: {deleted: true}});
    return {message: 'ok'};
};

exports.createAppealBySubLogin = async ({subLogin, curator, admin, appealId, contr_num, title, description, fileNames, type, draft, appealCuratorName, send_mail_option = false, cons_UID, blockThemeId, subLoginName, subLoginPhone, subLoginPosition, subLoginEmail, tp = false, cons_inn, cons_kpp, cons_name, adminEmail, contr_UID}) => {
    let appeal = null;
    let contract = null;

    if (appealId) {
        appeal = await Appeal.findOne({_id: appealId});
        if (!appeal) throw notFound('Appeal not found');
    }
    cons_UID = appeal ? appeal.cons_UID : subLogin ? subLogin.cons_UID : curator ? curator.cons_UID : cons_UID || null;
    let consumer = null;
    if (cons_UID) consumer = await Consumer.findOne({cons_UID}, {ssdUri: 1, cons_full_name: 1, cons_inn: 1, cons_kpp: 1, lkp: 1}).populate('ssdUri');
    const uri = getSsdUriByConsumer(consumer);
    if (contr_UID) {
        contract = await qPromConsumerContractInfo(contr_UID, uri);
        if (!contract) throw notFound('Contract not found');
    }
    let consumerInfo = null;
    try {
        if (cons_UID) consumerInfo = await qPromConsumerInfo(cons_UID, uri);
    } catch (err) {
        console.error(err.message);
    }
    let userText = '';
    let consumerText = '';
    if (subLoginName || subLoginEmail) {
        if (subLoginEmail) userText += `${subLoginEmail}, `;
        if (subLoginName) userText += `${subLoginName}, `;
        if (subLoginPosition) userText += `${subLoginPosition}, `;
        if (subLoginPhone) userText += `${subLoginPhone}, `;
    } else if (subLogin || curator) {
        if (!subLogin) subLogin = curator;
        userText += `${subLogin.login}, `;
        if (subLogin.firstName) userText += `${subLogin.firstName}, `;
        if (subLogin.lastName) userText += `${subLogin.lastName}, `;
        if (subLogin.middleName) userText += `${subLogin.middleName}, `;
        if (subLogin.position) userText += `${subLogin.position}, `;
        //if (subLogin.phone) userText += `${subLogin.phone}, `;
        if (subLoginPhone) userText += `${subLoginPhone}, `;
        subLogin = null;
    } else if (admin) {
        userText += 'Администратор ЛКЮЛ';
    }
    if (cons_name && cons_inn && cons_kpp) {
        consumerText += `${cons_name}, ИНН ${cons_inn}, КПП ${cons_kpp},`;
    } else if (consumer) {
        if (consumer.cons_full_name || consumer.cons_full_name) consumerText += `${consumer.cons_full_name || consumer.cons_full_name}, `;
        if (consumer.cons_inn) consumerText += `ИНН ${consumer.cons_inn}, `;
        if (consumer.cons_kpp) consumerText += `КПП ${consumer.cons_kpp}, `;
        if (consumer.lkp) consumerText += `ЛКП ${consumer.lkp},`;
    }
    userText = userText.trim();
    if (userText[userText.length - 1] === ',') userText = userText.slice(0, -1);
    consumerText = consumerText.trim().slice(0, -1);
    let subject;
    const t = `<b>Пользователь</b>: ${userText}<br>
<b>Потребитель</b>: ${consumerText}<br>
<b>Текст обращения</b>:<br>
${description}`;
    if (blockThemeId) {
        const {blockTheme} = await getBlockThemeById(blockThemeId);
        if (blockTheme) {
            subject = `ЛКЮЛ ${blockTheme.title} ${consumer ? (`${consumerInfo.cons_full_name || consumer.cons_full_name}`) : '-'}`;
        } else subject = title;
        if (blockTheme.emails && !adminEmail) {
            for (const e of blockTheme.emails) {
                await sendEmail(e, null, subject, fileNames, t);
            }
        } else {
            await sendEmail(adminEmail, null, subject, fileNames, t);
        }
    }
    if (tp) {
        await sendEmail(adminEmail || 'd11.test@yandex.ru', null, title, fileNames, t);
    } else if (send_mail_option || (consumerInfo && consumerInfo.cur_emale)) {
        let to = consumer && consumer.ssdUri ? consumer.ssdUri.email : null;
        if (contract && contract.cur_email) to = contract.cur_email;
        if (!to) {
            const ssdUri = await SsdUri.findOne();
            if (ssdUri) to = ssdUri.email || null;
        }
        if (to && send_mail_option) {
            await sendEmail(adminEmail || to, null, `${title}`, fileNames, t);
        } else if (send_mail_option === 0 && consumerInfo && consumerInfo.cur_emale) {
            await sendEmail(adminEmail || consumerInfo.cur_emale, null, `${title}`, fileNames, t);
        }
    }
    await Appeal({
        user: subLogin ? subLogin.user._id : null,
        anon: (!subLogin && !curator && !admin) ? true : false,
        subLogin: subLogin ? subLogin._id : null,
        appealCuratorName,
        cons_UID,
        appeal: appealId,
        viewed: false,
        contr_num,
        title,
        blockTheme: blockThemeId,
        description,
        fileNames,
        type,
        draft,
        direction: (curator || admin) ? 'incoming' : 'outgoing',
        state: draft ? null : appealId ? 'Ответ отправлен' : 'Отправлено',
        send_mail_option
    }).save();
    return {message: 'ok'};
};

exports.createAppealByCurator = async (curator, appealId, title, description, draft, fileNames, type, contr_num) => {
    let appeal = null;
    let cons_UID = null;
    if (appealId) {
        appeal = await Appeal.findOne({_id: appealId});
        if (!appeal) throw notFound('Appeal not found');
        cons_UID = appeal.cons_UID;
    }
    await Appeal({
        user: appeal ? appeal.user : null,
        subLogin: appeal ? appeal.subLogin : null,
        cons_UID: cons_UID || curator.cons_UID,
        viewed: false,
        title,
        appeal: appealId,
        description,
        fileNames,
        type,
        draft,
        contr_num,
        direction: 'incoming',
        state: draft ? null : appealId ? 'Ответ отправлен' : 'Отправлено'
    }).save();
    return {message: 'ok'};
};

exports.prepareDeviation = async (subLogin, session, sert, contr_UID) => {
    exports.checkTermOfUse(subLogin);
    const document = await Document.countDocuments({user: subLogin.user._id, contr_UID});
    if (!document) throw notFound('Document not found');
    const prepare = await prepareDeviation(session, sert, contr_UID);
    if (!prepare) throw notFound('Не удалось подготовить действие - отклонить');
    return prepare;
};

exports.deviation = async (subLogin, session, sert, contr_UID, files, comment) => {
    if (!comment) throw badRequest('Введите комментарий');
    const cancel = await deviation(session, sert, contr_UID, files, comment);
    await Promise.all([
        createHistory(subLogin, contr_UID, 'deviation'),
        Document.updateOne({contr_UID}, {$set: {putOff: false}})
    ]);
    if (!cancel) throw notFound('Не удалось отклонить');
    return {message: 'ok'};
};

exports.cancellation = async (subLogin, session, sert, contr_UID, files, comment) => {
    exports.checkTermOfUse(subLogin);
    const document = await Document.countDocuments({user: subLogin.user._id, contr_UID});
    if (!document) throw notFound('Document not found');
    const prepare = await prepareCancellation(session, sert, contr_UID);
    if (!prepare) throw notFound('Не удалось подготовить действие - анулирование');
    const cancel = await cancellation(session, sert, contr_UID, files, comment);
    await Promise.all([
        createHistory(subLogin, contr_UID, 'cancel'),
        Document.updateOne({contr_UID, user: subLogin.user._id}, {$set: {putOff: false}})
    ]);
    if (!cancel) throw notFound('Не удалось анулировать дествие');
    return {message: 'ok'};
};

exports.putOff = async (subLogin, contr_UID, putOff) => {
    exports.checkTermOfUse(subLogin);
    const query = {contr_UID, user: subLogin.user._id};
    const document = await Document.findOne(query);
    if (!document) throw notFound('Не найден документ');
    await Document.updateOne(query, {$set: {putOff}});
    return {message: 'ok'};
};

exports.existsDocument = (_contr_UID, _contr_num, session) => {
    const st_date = new Date(0);
    return Promise.all(REGISTER_TYPES.map(type => {
        return getDocumentListByFolders(session, type, st_date);
    }))
        .then(() => {
            return null;
        });
};

exports.register_doc = async (data, subLogin) => {
    exports.checkTermOfUse(subLogin);
    const {contr_status, sign, session, owner_name, contr_name, document_type, contr_UID, contr_num, contr_date, description, type, senderName, senderType, senderEmail, files, baseId, subType} = data;
    const {cons_UID, consumer} = subLogin;
    const {cons_inn, cons_kpp} = consumer;
    const createDocumentResult = await createDocument(session, cons_inn, cons_kpp, receiver_name, receiver_inn, receiver_kpp, description, contr_UID, contr_num, contr_date, type, baseId, null, subType);
    if (!createDocumentResult) throw badRequest('Document not created');
    const doc_uids = [];
    for (const file of files) {
        const base64 = base64gen(file);
        const {doc_uid} = await exports.createAttachment(subLogin, session, base64, file, contr_UID);
        doc_uids.push(doc_uid);
    }
    const owner_UID = cons_UID;
    return Promise.all([
        Document({
            user: subLogin.user._id,
            senderName,
            senderType,
            senderEmail,
            doc_uids,
            receiver_name,
            contr_status,
            receiver_inn,
            receiver_kpp,
            sign,
            cons_UID,
            owner_UID,
            owner_name,
            contr_name,
            document_type,
            contr_UID,
            contr_num,
            contr_date,
            description,
            viewed: false,
            marker: false
        }).save(),
        createHistory(subLogin, contr_UID, 'create')
    ])
        .then(async () => {
            return {message: 'OK'};
        });
};

exports.putAttachmentToDocument = async (subLogin, session, files, contr_UID) => {
    const doc_uids = [];
    for (const file of files) {
        const base64 = base64gen(file);
        const {doc_uid} = await exports.createAttachment(subLogin, session, base64, file, contr_UID);
        doc_uids.push(doc_uid);
    }
    if (doc_uids.length) await Document.updateOne({user: subLogin.user._id, contr_UID}, {$addToSet: {doc_uids: {$each: doc_uids}}});
    return {message: 'ok'};
};

exports.changeList = async (subLogin, session) => {
    exports.checkTermOfUse(subLogin);
    if (!subLogin.consumer) throw notFound('Consumer not found');
    const {cons_inn, cons_kpp} = subLogin.consumer;
    let changeList = await ChangeList.findOne({subLogin: subLogin._id, cons_inn, cons_kpp});
    if (!changeList) {
        changeList = new ChangeList({
            subLogin: subLogin._id,
            cons_inn,
            cons_kpp,
            counter: 0
        });
    }
    const [result, monthResult] = await Promise.all([
        changeListSbis(session, cons_inn, cons_kpp, changeList.updatedAt),
        changeListSbis(session, cons_inn, cons_kpp, moment().add(-30, 'minutes')),
    ]);
    if (!changeList.counter) changeList.counter = 0;
    changeList.counter++;
    await changeList.save();
    return {result, monthResult};
};

exports.putMarker = async (subLogin, contr_UID, marker) => {
    exports.checkTermOfUse(subLogin);
    const document = await Document.findOne({contr_UID, user: subLogin.user._id});
    if (!document) throw notFound('Document not found');
    document.marker = marker;
    await document.save();
    return {message: 'ok'};
};

exports.saveSign = async (subLogin, sert_token, contr_UID, files) => {
    exports.checkTermOfUse(subLogin);
    const document = await Document.findOne({user: subLogin.user._id, contr_UID});
    if (!document) throw notFound('Document not found');
    const newFiles = [];
    if (document.files) {
        loop: for (const file of files) {
            for (const f of document.files) {
                if (file.doc_uid === f.doc_uid) {
                    f.fileName = file.fileName;
                    f.sign = file.sign;
                    f.doc_uid = file.doc_uid;
                    continue loop;
                }
            }
            newFiles.push(file);
        }
        document.files.push(...newFiles);
    } else document.files = files;
    if (sert_token) document.sert_token = sert_token;
    await document.save();
    return {message: 'ok'};
};

exports.signToSignSaveDocument = async (subLogin, session, contr_UID) => {
    exports.checkTermOfUse(subLogin);
    const document = await Document.findOne({user: subLogin.user._id, contr_UID});
    if (!document) throw notFound('Document not found');
    const {sert_token, files} = document;
    if (!sert_token || !document.files) throw notFound('Sign, file or sert_token not found');
    await exports.signDocument(subLogin, session, sert_token, contr_UID, files);
    return {message: 'ok'};
};

exports.getDocument = async (subLogin, session, contr_UID) => {
    exports.checkTermOfUse(subLogin);
    const [{result}, document] = await Promise.all([
        getDocument(session, contr_UID),
        Document.findOne({contr_UID, user: subLogin.user._id})
    ]);
    if (!document) throw badRequest('Document not found');
    document.viewed = true;
    await document.save();
    result.document = document;
    return result;
};

exports.getDocumentHistory = async (subLogin, contr_UID, doc_uid, state, subLoginId, cons_UID) => {
    exports.checkTermOfUse(subLogin);
    const query = {user: subLogin.user._id};
    if (contr_UID) query.contr_UID = contr_UID;
    if (doc_uid) query.doc_uid = doc_uid;
    if (state) query.state = state;
    if (subLoginId) query.subLogin = subLoginId;
    if (cons_UID) query.cons_UID = cons_UID;
    const documentHistories = await DocumentHistory.find(query);
    return {documentHistories};
};

exports.signDocument = async (subLogin, session, sert_token, contr_UID, files) => {
    exports.checkTermOfUse(subLogin);
    if (!files) throw notFound('Document data nod found');
    const prepare = await prepareSendToSignDocument(session, sert_token, contr_UID);
    if (!prepare) throw badRequest('Prepare to sign not completed');
    const send = await sendToSignDocument(session, files, sert_token, contr_UID);
    if (!send) throw badRequest('Send to sign not completed');
    await createHistory(subLogin, contr_UID, 'sign');
    return {message: 'OK'};
};

exports.sbisTypes = SBIS_TYPES;

exports.list = async (subLogin, query, sbisTypes = null) => {
    exports.checkTermOfUse(subLogin);
    const {consumer} = subLogin;
    if (!consumer) throw notFound('Consumer not found');
    const {session} = query;
    const {cons_inn, cons_kpp} = consumer;
    const documentsArray = await Promise.all( sbisTypes && sbisTypes[0] ? sbisTypes.map(t => {
        return getDocumentList(session, cons_inn, cons_kpp, t);
    }) : SBIS_TYPES.map(t => {
        return getDocumentList(session, cons_inn, cons_kpp, t);
    }));
    const result = {deleteDocuments: []};
    for (const documents of documentsArray) {
        for (const doc of documents.result['Документ']) {
            doc.doc = await Document.findOne({contr_UID: doc['Идентификатор'], user: subLogin.user._id}).lean();
            if (!doc.doc) doc.doc = await Document({contr_UID: doc['Идентификатор'], viewed: false, marker: false, user: subLogin.user._id}).save();
            let status = doc['Состояние']['Код'];
            if (status === '22') {
                continue;
            }
            if (doc['Удален'] === 'Да') {
                result.deleteDocuments.push(doc);
                continue;
            }
            if (!result[SBIS_DIRECTION[doc['Направление']]]) result[SBIS_DIRECTION[doc['Направление']]] = [];
            result[SBIS_DIRECTION[doc['Направление']]].push(doc);
            // if (!status || parseInt(status) < 0 || parseInt(status) > 27) throw badRequest('Document status code incorrect');
            // const type = DOCUMENT_STATUS[doc['Тип']] ? doc['Тип'] : 'default';
            // if (!DOCUMENT_STATUS[type][status]) status = 'default';
            // if (!result[DOCUMENT_STATUS[type][status]]) result[DOCUMENT_STATUS[type][status]] = [];
            // result[DOCUMENT_STATUS[type][status]].push(doc);
        }
    }
    result.changes = await changeListSbis(session, cons_inn, cons_kpp, new Date(0));
    return result;
};

exports.createAttachment = async (subLogin, session, base64, fileName, contr_UID) => {
    exports.checkTermOfUse(subLogin);
    if (!session || !base64 || !fileName || !contr_UID) throw badRequest('Create attachment data error');
    const attachment = await createAttachment(session, base64, fileName, contr_UID);
    if (!attachment) throw notFound('Attachment not found');
    if (!attachment.result || !attachment.result['Вложение'] || !attachment.result['Вложение'][0] || !attachment.result['Вложение'][0]['Идентификатор']) {
        throw badRequest('Attachment incorrect');
    }
    const doc_uid = attachment.result['Вложение'][0]['Идентификатор'];
    await createHistory(subLogin, contr_UID, 'create_attachment');
    return {doc_uid};
};

exports.prepareApproveDocument = async (subLogin, session, sert_token, contr_UID) => {
    exports.checkTermOfUse(subLogin);
    const document = await Document.findOne({contr_UID, user: subLogin.user._id});
    if (!document) throw notFound('Document not found');
    const prepare = await prepareDeviation(session, sert_token, contr_UID, true);
    return {result: prepare};
};

exports.approveDocument = async (subLogin, session, contr_UID, sert_token, files) => {
    exports.checkTermOfUse(subLogin);
    const document = await Document.findOne({contr_UID, user: subLogin.user._id});
    if (!document) throw notFound('Document not found');
    const result = await Promise.all([
        approveDocument(session, sert_token, contr_UID, files),
        Document.updateOne({contr_UID, user: subLogin.user._id}, {$set: {putOff: false}})
    ]);
    await createHistory(subLogin, contr_UID, 'approve');
    return {result};
};

exports.getAttachment = async (contr_UID) => {
    if (!contr_UID) throw badRequest('Необходимо выбрать договор');
    const document = await Document.findOne({contr_UID});
    if (!document) throw notFound('Document not found');
    const {file} = document;
    if (!file) throw notFound('Document file not found');
    return {file: `${baseUri}/public/${file}`};
};

exports.deleteDocument = async (query, subLogin) => {
    exports.checkTermOfUse(subLogin);
    const {contr_UID, session} = query;
    return exports.list(subLogin, query)
        .then(documents => {
            let flag = false;
            if (documents && documents.deleteDocuments)
                for (const document of documents.deleteDocuments)
                    if (document['Идентификатор'] === contr_UID) {
                        flag = true;
                        break;
                    }
            if (!flag) throw conflict('Договор не находится в папке удаленных');
            return deleteDocument(session, contr_UID)
                .then(() => {
                    return {message: 'OK'};
                });
        });
};

exports.removeDocument = async (subLogin, query) => {
    exports.checkTermOfUse(subLogin);
    const {contr_UID, session} = query;
    return removeDocument(session, contr_UID)
        .then(async () => {
            await Document.deleteOne({user: subLogin.user._id, contr_UID});
            await createHistory(subLogin, contr_UID, 'remove');
            return {message: 'OK'};
        });
};


exports.newsCreate = async (_user, title, body, content, regionId) => {
    await New({
        title,
        body,
        content,
        regionId
    }).save();
    return {message: 'ok'};
};

exports.getListOfNews = async (_subLogin, from, to, page, limit, regionId) => {
    limit = limit ? parseInt(limit) : 20;
    page = page ? parseInt(page) : 1;
    if (!limit || limit < 1) limit = 20;
    if (!page || page < 1) page = 1;
    const query = {regionId};
    if (from || to) {
        query.createdAt = {$gte: from ? new Date(from) : new Date(0), $lte: to ? new Date(to) : new Date()};
    }
    const [news, count] = await Promise.all([
        New.find(query).limit(limit).skip(limit * (page - 1)),
        New.countDocuments(query)
    ]);
    return {news, count};
};

exports.getNewsById = async (_subLogin, _id) => {
    const news = await New.findOne({_id});
    if (!news) throw notFound('News not found');
    return {news};
};

exports.updateNews = async (_subLogin, _id, title, body, content, regionId) => {
    const news = await New.findOne({_id});
    if (!news) throw notFound('News not found');
    if (title || title === 0) news.title = title;
    if (body || body === 0) news.body = body;
    if (content) news.content = content;
    if (regionId) news.regionId = regionId;
    await news.save();
    return {message: 'ok'};
};

exports.deleteNews = async (_subLogin, _id) => {
    const news = await New.findOne({_id});
    if (!news) throw notFound('News not found');
    await New.deleteOne({_id});
    return {message: 'ok'};
};

exports.qGetDocInform = async () => {
    const ssdUris = await SsdUri.find({});

    for(const ssd of ssdUris) {
        const {Informs: docInfo} = await qGetDocInform(ssd.uri);
        if (!docInfo) {
            continue
        };
        for (const doc of docInfo) {
            doc.cons_UIDs = [doc.cons_uid]; 
            doc.sended = false;
        }
        if (docInfo && docInfo.length) {
            await ConsumerNotification.insertMany(docInfo);
        }
    }

    return {message: 'ok'};
};