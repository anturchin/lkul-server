const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrderSchedule = new Schema({
    orderType: String,
    merchant: String,
    amount: Number,
    currency: String,
    description: String,
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    subLogin: {
        type: Schema.Types.ObjectId,
        ref: 'sub_login',
    },
    repeatPeriodHours: Number,
    startDate: Date,
    addParams: {
        index: String,
    },
    approveUrl: String,
    cancelUrl: String,
    declineUrl: String,
    email: String,
    contr_UID: String,
}, {
    timestamps: true,
    strict: false,
});

module.exports = mongoose.model('order_schedule', OrderSchedule);