const { internal } = require("boom");
const Consumer = require("../models/Consumer");
const Notification = require("../models/Notification");
const ConsumerNotification = require("../models/ConsumerNotification");
const User = require("../models/User");
const Region = require("../models/Region");
const {
  createConsumerNotification,
} = require("../controllers/DocumentController");
const { getMetBlockLikeDate } = require("../controllers/MetController");
const qPromConsumerInfo = require("../requests/qPromConsumerInfo");
const {
  getSsdUriByCons_UID,
  getSsdUriByConsumer,
} = require("../libs/getSsdUriByConsumer");
const sendEmail = require("../libs/sendEmail");
const moment = require("moment");

const months = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
  "январь",
];
const monthsDecl = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
  "января",
];
const NOT_EMAIL_NOTIFICATION_TYPE = [
  "Уведомление: Новый документ",
  "Уведомление: Документ изменен",
  "Новый документ",
  "Документ изменен",
];
const getNotificationText = (
  consumer,
  emailCurrentMonthYear,
  metBLockingDate,
  regionName
) => {
  if (!consumer) {
    throw internal("consumer is not defined!");
  }

  const text = `
    Потребитель: ${consumer.cons_full_name}
    ИНН/КПП: ${consumer.cons_inn}/${consumer.cons_kpp}
    Стенд: ${process.env.PROFILE}
    ${regionName} напоминает о необходимости передачи данных о расходе газа за ${emailCurrentMonthYear} не позднее ${metBLockingDate.format(
    "D"
  )} ${
    monthsDecl[metBLockingDate.month()]
  } ${metBLockingDate.year()}г. ${metBLockingDate.format("HH:mm")} по МСК`;

  return text;
};

const consumerMailText = (event, text, cons_full_name, cons_inn, cons_kpp) => {
  let result = `Потребитель: ${cons_full_name}\n`;
  result += `ИНН/КПП: ${cons_inn}/${cons_kpp}\n`;
  result += `Уведомление: ${event || text}`;
  return result;
};

const isUserAndConsumerSameRegion = (consumer, user) => {
  if (!user || !consumer) {
    return false;
  }
  if (!consumer.ssdUri) {
    return false;
  }
  if (!consumer.ssdUri.regionId || !user.regionId) {
    return false;
  }
  if (consumer.ssdUri.regionId.toString() != user.regionId.toString()) {
    return false;
  }
  return true;
};

exports.sendingEmailAboutMetBlocking = async (
  cons_UID,
  emailCurrentMonthYear,
  metBLockingDate
) => {
  try {
    const notifications = await Notification.find({
      cons_UID,
      "emails.0": { $exists: true },
    }).lean();
    const consumer = await Consumer.findOne({ cons_UID })
      .populate({
        path: "ssdUri",
        model: "ssd_uri",
        select: "name email uri regionId",
      })
      .lean();

    if (!consumer) {
      return;
    }
    const uri = getSsdUriByConsumer(consumer);
    if (!uri) {
      return;
    }
    const region = await Region.findOne({ _id: consumer.ssdUri.regionId });
    if (!region.isEnabledMetBlockings) {
      return;
    }

    const emails = {};
    for (const notification of notifications) {
      const user = await User.findOne(
        { _id: notification.user },
        { email: 1, regionId: 1 }
      );
      if (!isUserAndConsumerSameRegion(consumer, user)) {
        continue;
      }

      for (const email of notification.emails) {
        if (!emails[email]) {
          emails[email] = email;
        }
      }
    }
    metBLockingDate = moment(metBLockingDate).add(3, "hours");
    const text = getNotificationText(
      consumer,
      emailCurrentMonthYear,
      metBLockingDate,
      region.fullName
    );
    console.log("SENDING", {
      emails: Object.values(emails),
      text,
      metBLockingDate: metBLockingDate.toISOString(),
    });
 
    const usersMap = {};
    const consumers = await Consumer.find({ cons_UID: consumer.cons_UID });
    for (const cons of consumers) {
      usersMap[cons.user] = cons.user;
    }
    await Promise.all([
      Object.values(emails).map((email) =>
        sendEmail(email, text, "Блокировка передачи показаний/расхода")
      ),
      Object.values(usersMap).map((user) =>
        createConsumerNotification(
          [consumer.cons_UID],
          "met_blocking",
          text,
          [user],
          false
        )
      ),
    ]);
  } catch (e) {
    console.log("SENDING EMAIL MET BLOCKING", e);
    return;
  }
};

exports.sending = async (cons_UID, cn) => {
  const ssd = await getSsdUriByCons_UID(cons_UID);
  let consumerFull;
  try {
    consumerFull = await qPromConsumerInfo(cons_UID, ssd);
  } catch (err) {
    console.error(err.message);
  }
  if (!consumerFull) {
    consumerFull = {};
  }
  const notifications = await Notification.find({
    cons_UID,
    "emails.0": { $exists: true },
  }).lean();

  const emails = {};
  for (const notification of notifications) {
    console.log(
      new Date(),
      "NOTIFICATION"
      // JSON.stringify(notification)
    );
    if (
      cn.users &&
      cn.users.length &&
      !cn.users.includes(String(notification.user))
    ) {
      continue;
    }

    const user = await User.findOne({ _id: notification.user });
    if (!user) {
      continue;
    }
    const consumer = await Consumer.findOne({ cons_UID, user: user._id })
      .populate({
        path: "ssdUri",
        model: "ssd_uri",
        select: "name email uri regionId",
      })
      .lean();

    if (!isUserAndConsumerSameRegion(consumer, user)) {
      continue;
    }
    for (const email of notification.emails) {
      if (!emails[email]) {
        emails[email] = email;
      }
    }
  }
  for (const email of Object.values(emails)) {
    const text = consumerMailText(
      cn.event,
      cn.text,
      consumerFull.cons_full_name,
      consumerFull.cons_INN,
      consumerFull.cons_KPP
    );
    if (cn.type && !NOT_EMAIL_NOTIFICATION_TYPE.includes(cn.type)) {
      await sendEmail(email, text, cn.type);
    }
  }
};

exports.sendMetNotifications = async (workersBusy) => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentDay = currentDate.getDate();

  if (currentDay === 25) {
    this.sendingMetBlocking(workersBusy);
  }
  if (currentMonth === 1 && currentDay === 28) {
    this.sendingMetBlocking(workersBusy);
  }
  if (currentMonth !== 1 && currentDay === 30) {
    this.sendingMetBlocking(workersBusy);
  }
};
exports.sendingMetBlocking = async (workersBusy) => {
  try {
    const conses = await Consumer.aggregate([{ $group: { _id: "$cons_UID" } }]);
    const cons_UIDs = conses.map((c) => c._id);
    const dt = new Date();
    const currentMonth = dt.getMonth();
    const currentYear = dt.getFullYear();
    const emailCurrentMonthYear = `${months[currentMonth]} ${currentYear}`;

    const metBLockingDate = await getMetBlockLikeDate();
    for (const cons_UID of cons_UIDs) {
      await workersBusy({}, cons_UID, null, {
        emailCurrentMonthYear,
        metBLockingDate,
      });
    }
  } catch (e) {
    console.log("sendingMetBlocking", e);
  }
};

exports.sendDocsOnEmail = async (workersBusy) => {
  console.log(process.pid, "ENTER IN SCRIPT");
  while (true) {
    try {
      const consumerNotifications = await ConsumerNotification.find({
        sended: false,
      })
        .limit(1)
        .lean();
      console.log(
        "🚀 ~ file: NotificationClasterController.js ~ line 262 ~ exports.sendDocsOnEmail= ~ consumerNotifications",
        consumerNotifications
      );
      console.log("START SCRIPT", process.pid, consumerNotifications.length);
      for (const cn of consumerNotifications) {
        console.log(
          "CN",
          JSON.stringify({
            _id: cn._id,
            type: cn.type,
            text: cn.text,
            allConsumers: cn.allConsumers,
            createdAt: cn.createdAt,
            updatedAt: cn.updatedAt,
          })
        );
        if (!cn.users) {
          continue;
        }

        cn.users = cn.users.map(String);
        let counter = 0;
        for (const cons_UID of cn.cons_UIDs) {
          try {
            counter++;
            console.log(counter, cons_UID);
            await workersBusy(cn, cons_UID, "notification");
          } catch (err) {
            console.log("LOOP ERROR", err);
          }
        }

        console.log("Update consumer notification");
        const r = await ConsumerNotification.updateOne(
          { _id: cn._id },
          { $set: { sended: true } }
        );
        console.log(r);
      }
    } catch (err) {
      console.log("ERROR", err);
    }
    await new Promise((resolve, _reject) => {
      setTimeout(async () => {
        resolve();
      }, 1000 * 120);
    });
  }
};
