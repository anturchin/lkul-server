const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Order = new Schema({
    orderType: String,
    merchant: String,
    amount: Number,
    currency: String,
    description: String,
    orderId: String,
    sessionId: String,
    url: String,
    status: String,
    addParams: {
        index: String,
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    subLogin: {
        type: Schema.Types.ObjectId,
        ref: 'sub_login',
    },
    regionId: {
        type: Schema.Types.ObjectId,
        ref: 'region',
    },
    email: String,
    contr_UID: String,
    cons_UID: String,
    operationId: String,
    smorodina_UID: String,
    invoiceCompleted: { type: Boolean, default: false },
    document: {}, //OFD
    tax_sum: Number,
    tax: String,
    orderTypeNumber: Number,
}, {
    timestamps: true,
    strict: false,
});

module.exports = mongoose.model('order', Order);