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
const Consumer = require("../../models/Consumer");

const SuperAdmin = require("../../models/SuperAdmin");

(async () => {
  try {
    const config = dotenv.config({
      path: path.resolve(__dirname, "./.migration-data"),
    });
    console.log(JSON.stringify(config, null, 2));
    const pConfig = config.parsed || null;
    if (!pConfig) {
      throw new Error("Файла данных миграции не существует.");
    }

    const ssdUris = await SsdUri.find();
    console.log("Все ссд: ", JSON.stringify(ssdUris, null, 2))

    const ssdUrisCount = await SsdUri.countDocuments();
    if (!ssdUrisCount) {
      console.log(
        "Нет подключенных СИД, а без них не заработает."
      );
      return;
    }
    
    const ssdUriMsk = await SsdUri.findOne();
    const regionMsk = await Region({
      name: "Московская область",
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
      ssdUri: ssdUriMsk._id,
    }).save();
    console.log("Добавлены начальные регионы.");

    await SsdUri.findOneAndUpdate(
      { _id: ssdUriMsk._id },
      { $set: { regionId: regionMsk._id } }
    );
    console.log("Ссд обновлены");

    await Admin.updateMany({}, { $set: { regionId: regionMsk._id } });
    console.log("Все администраторы обновлены.");
    await Curator.updateMany({}, { $set: { regionId: regionMsk._id } });
    console.log("Все кураторы обновлены.");
    await BlockTheme.updateMany({}, { $set: { regionId: regionMsk._id } });
    console.log("Все обращения в поддержку обновлены.");
    await MetBlocking.updateMany({}, { $set: { regionId: regionMsk._id } });
    console.log("Все блокировки обновлены.");
    await New.updateMany({}, { $set: { regionId: regionMsk._id } });
    console.log("Все новости обновлены.");
    await Question.updateMany({}, { $set: { regionId: regionMsk._id } });
    console.log("Все вопросы обновлены.");
    await Template.updateMany({}, { $set: { regionId: regionMsk._id } });
    console.log("Все шаблоны обновлены.");
    await Contact.updateMany({}, { $set: { regionId: regionMsk._id } });
    console.log("Все контакты обновлены.");
    await ConsumerNotification.updateMany(
      {},
      { $set: { regionId: regionMsk._id } }
    );
    console.log("Все уведомления обновлены.");
    await User.updateMany({}, { $set: { regionId: regionMsk._id } });
    console.log("Все пользователи обновлены.");

    const consumers = await Consumer.find().populate("ssdUri");
    for (const consumer of consumers) {
      await Order.updateMany(
        { user: consumer.user },
        { $set: { regionId: consumer.ssdUri.regionId } }
      );
    }
    console.log("Все заказы обновлены.");

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
