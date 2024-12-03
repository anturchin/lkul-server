require("../../db")();
const dotenv = require("dotenv");
const path = require("path");
const auth = require("vvdev-auth");

const Region = require("../../models/Region");
const SsdUri = require("../../models/SsdUri");
const User = require("../../models/User");
const Admin = require("../../models/Admin");
const Curator = require("../../models/Curator");
const BlockTheme = require("../../models/BlockTheme");
const MetBlocking = require("../../models/MetBlocking");
const ConsumerNotification = require("../../models/ConsumerNotification");
const Contact = require("../../models/Contact");
const New = require("../../models/New");
const Order = require("../../models/Order");
const Question = require("../../models/Question");
const Template = require("../../models/Template");

const SuperAdmin = require("../../models/SuperAdmin");

(async () => {
  try {
    const config = dotenv.config({
      path: path.resolve(__dirname, "./.migration-data"),
    });
    const pConfig = config.parsed || null;
    if (!pConfig) {
      throw new Error("Файла данных миграции не существует.");
    }

    const region = await Region({
      name: pConfig.REGION_NAME,
      contacts: {
        consumerAdministration: {
          email: pConfig.REGION_CONSUMER_ADMINISTRATION_EMAIL,
          phone: pConfig.REGION_CONSUMER_ADMINISTRATION_PHONE,
        },
        communityAdministration: {
          email: pConfig.REGION_COMMUNITY_ADMINISTRATION_EMAIL,
          phone: pConfig.REGION_COMMUNITY_ADMINISTRATION_PHONE,
        },
        support: {
          email: pConfig.REGION_SUPPORT_EMAIL,
          phone: pConfig.REGION_SUPPORT_PHONE,
        },
      },
      pay: {
        lspu: pConfig.REGION_PAY_LSPU,
        pointCode: pConfig.REGION_PAY_POINT_CODE,
        abonentId: pConfig.REGION_PAY_ABONENT_ID,
        idpu: pConfig.REGION_PAY_IDPU,
        service: pConfig.REGION_PAY_SERVICE,
        typePaymentCode: pConfig.REGION_PAY_TYPE_PAYMENT_CODE,
        merchant: pConfig.REGION_PAY_MERCHANT,
        equiring: pConfig.REGION_PAY_EQUIRING,
        gateUrl: pConfig.REGION_PAY_GATE_URL,
        inn: pConfig.REGION_PAY_INN,
        documentCreateUri: pConfig.REGION_PAY_DOCUMENT_CREATE_URI,
        apiKey: pConfig.REGION_PAY_API_KEY,
      },
    }).save();
    console.log("Добавлен начальный регион.");

    await Admin.updateMany({}, { $set: { regionId: region._id } });
    console.log("Все администраторы обновлены.");
    await User.updateMany({}, { $set: { regionId: region._id } });
    console.log("Все пользователи обновлены.");
    await SsdUri.updateMany({}, { $set: { regionId: region._id } });
    console.log("Все СИД обновлены.");
    await Curator.updateMany({}, { $set: { regionId: region._id } });
    console.log("Все кураторы обновлены.");
    await BlockTheme.updateMany({}, { $set: { regionId: region._id } });
    console.log("Все обращения в поддержку обновлены.");
    await MetBlocking.updateMany({}, { $set: { regionId: region._id } });
    console.log("Все блокировки обновлены.");
    await ConsumerNotification.updateMany(
      {},
      { $set: { regionId: region._id } }
    );
    console.log("Все уведомления обновлены.");
    await Contact.updateMany({}, { $set: { regionId: region._id } });
    console.log("Все контакты обновлены.");
    await New.updateMany({}, { $set: { regionId: region._id } });
    console.log("Все новости обновлены.");
    await Order.updateMany({}, { $set: { regionId: region._id } });
    console.log("Все заказы обновлены.");
    await Question.updateMany({}, { $set: { regionId: region._id } });
    console.log("Все вопросы обновлены.");
    await Template.updateMany({}, { $set: { regionId: region._id } });
    console.log("Все шаблоны обновлены.");

    const superAdminLogin = pConfig.SUPER_ADMIN__LOGIN || "AdminGas";
    const superAdminPassword =
      pConfig.SUPER_ADMIN__PASSWORD || "a2lskdOasd1asdi8dunjwk";
    const hash = await auth.hashPassword(superAdminPassword);
    await SuperAdmin({
      password: hash,
      login: superAdminLogin,
    }).save();
    console.log("Супер админ добавлен.");

    console.log("База данных успешно обновлена!");
  } catch (error) {
    console.log("error", error);
    throw new Error(error);
  } finally {
    process.exit(0);
  }
})();
