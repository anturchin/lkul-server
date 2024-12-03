const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BlockTheme = new Schema({
    emails: [String],
    phones: [String],
    title: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    subLogin: {
        type: Schema.Types.ObjectId,
        ref: 'sub_login'
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    onlyConfirmUsers: {
        type: Boolean,
        default: false
    },
    regionId: {
        type: Schema.Types.ObjectId,
        ref: 'region'
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('block_theme', BlockTheme);