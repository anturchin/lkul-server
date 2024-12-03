const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Notification = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    emails: [String],
    phones: [String],
    cons_UID: String,
    sendEmail: Boolean,
    sendPhone: Boolean
}, {
    timestamps: true
});

module.exports = mongoose.model('notification', Notification);