const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Notice = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    message: String,
    viewedSubLogins: [{
        type: Schema.Types.ObjectId,
        ref: 'sub_logins'
    }],
    type: String
}, {
    timestamps: true,
    strict: false
});

module.exports = mongoose.model('notice', Notice);