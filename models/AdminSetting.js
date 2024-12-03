const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AdminSetting = new Schema({
    tokenActivityPeriod: Number,
    orderAmountCurrency: Number,
});

module.exports = mongoose.model('admin_setting', AdminSetting);

