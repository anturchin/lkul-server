const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserTokenActivity = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    expiredAt: {
        type: Number,
    },
    lastActivityDate: Date
});

module.exports = mongoose.model('user_token_activity', UserTokenActivity);

