const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Smorodina = new Schema({

    UID: String,
    InvoiceStateCode: Number,
    Requests: {},
    AnsCreateInvoice: {},
    AnsUpdateInvoice: {},
    AnsConfirmInvoice: {},
    FailedXML : String,
}, {
    timestamps: true,
    strict: false,
});

module.exports = mongoose.model('smorodina', Smorodina);