const mongoose = require("mongoose");
const config = require("../config");
const Schema = mongoose.Schema;

// Оператор онлайн касс (ККТ)

// Блокировать показания только для своего региона

// Получатель только МРГ региона

const RegionSchema = new Schema(
  {
    logo: {
      type: String,
    },
    fullName: {
      type: String,
    },
    name: {
      type: String,
    },
    inn: {
      type: String,
    },
    kpp: {
      type: String,
    },
    pay: {
      /**
       * Вид перевода. Идентификатор, обозначающий, что платеж поступил из ЛК ЮЛ ЮЗДО.
       */
      typePaymentCode: {
        type: String,
        defualt: "40001",
      },
      /**
       * Лицевой счет у Поставщика услуг
       */
      lspu: {
        type: String,
      },
      /**
       * Точка приема
       */
      pointCode: {
        type: String,
      },
      /**
       * Абонент
       */
      abonentId: {
        type: String,
      },
      /**
       * Поставщик
       */
      idpu: {
        type: String,
      },
      /**
       * Услуга
       */
      service: {
        type: String,
      },
      /**
       * Мерчант
       */
      merchant: {
        type: String,
      },
      /**
       * Эквайринг
       */
      equiring: {
        type: String,
      },
      /**
       * Адрес платежного шлюза
       */
      gateUrl: {
        type: String,
      },

      documentCreateUri: {
        type: String,
      },

      inn: {
        type: String,
      },

      apiKey: {
        type: String,
        default: config.payment.apiKey,
      },
    },
    contacts: {
      consumerAdministration: { email: String, phone: String },
      communityAdministration: { email: String, phone: String },
      support: { email: String, phone: String },
    },
    isEnabledMetBlockings: {
      type: Boolean,
      default: false,
    },
    isEnablePayment: {
      type: Boolean,
      default: false,
    },
    ssdUri: {
      type: Schema.Types.ObjectId,
      ref: "ssd_uri",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("region", RegionSchema);
