const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DocumentHistory = new Schema({
    contr_UID: String,
    doc_uid: String,
    cons_UID: String,
    state: String,
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    subLogin: {
        type: Schema.Types.ObjectId,
        ref: 'sub_login'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('document_history', DocumentHistory);