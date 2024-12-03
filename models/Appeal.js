const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Appeal = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    blockThemeId: {
        type: Schema.Types.ObjectId,
        ref: 'block_theme'
    },
    subLogin: {
        type: Schema.Types.ObjectId,
        ref: 'sub_login'
    },
    appeal: {
        type: Schema.Types.ObjectId,
        ref: 'appeal'
    },
    curator: {
        type: Schema.Types.ObjectId,
        ref: 'curator'
    },
    appealCuratorName: String,
    cons_UID: String,
    viewed: Boolean,
    contr_UID: String,
    doc_uid: String,
    contr_num: String,
    title: String,
    description: String,
    fileNames: [String],
    type: String,
    draft: Boolean,
    direction: String,
    state: String,
    send_mail_option: String,
    anon: Boolean,
    deleted: Boolean
}, {
    timestamps: true
});

module.exports = mongoose.model('appeal', Appeal);