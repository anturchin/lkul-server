const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    consumerNotification: {
        type: Schema.Types.ObjectId,
        ref: 'consumer_notification'
    },
    cons_UID: String,
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    subLogin: {
        type: Schema.Types.ObjectId,
        ref: 'sub_login'
    },
    viewed: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('consumer_notification_view', schema);