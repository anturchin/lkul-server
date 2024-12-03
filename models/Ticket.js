const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Ticket = new Schema({
    email: String,
    summary: String,
    description: String,
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    subLogin: {
        type: Schema.Types.ObjectId,
        ref: 'sub_login',
    },
    cons_UID: String,
    attachments: [{
        buffer: String,
        filename: String,
    }],
    exKey: String,
    exId: String,
}, {
    timestamps: true,
    strict: false,
});

module.exports = mongoose.model('ticket', Ticket);