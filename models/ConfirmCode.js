const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConfirmCode = new Schema(
  {
    code: String,
    email: String,
    hash: String,
    firstName: String,
    lastName: String,
    middleName: String,
    consumers: [
      {
        cons_inn: String,
        cons_kpp: String,
        cons_uid: String,
        cons_full_name: String,
        lkp: String,
      },
    ],
    ssdUri: {
      type: Schema.Types.ObjectId,
      ref: "ssd_uri",
    },
    regionId: {
      type: Schema.Types.ObjectId,
      ref: "region",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('confirm_code', ConfirmCode);