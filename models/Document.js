const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DocumentSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    viewed: {
        type: Boolean,
        default: false
    },
    marker: {
        type: Boolean,
        default: false
    },
    putOff: Boolean,
    doc_uids: [String],
    senderName: String,
    senderType: String,
    senderEmail: String,
    userFileName: {
        type: String
    },
    contr_date: {
        type: Date
    },
    owner_name: {
        type: String
    },
    contr_name: {
        type: String
    },
    owner_UID: {
        type: String
    },
    contr_UID: {
        type: String
    },
    cons_UID: {
        type: String
    },
    files: [{
        sign: String,
        fileName: String,
        doc_uid: String
    }],
    sert_token: String,
    contr_status: {
        type: String
    },
    receiver_name: {
        type: String
    },
    receiver_kpp: String,
    receiver_inn: String,
    receiver_UID: {
        type: String
    },
    document_type: {
        type: String
    },
    contr_num: {
        type: String
    },
    delete: {
        type: Boolean
    },
    consideration: {
        type: Boolean
    },
    description: String
}, {
    timestamps: true
});

module.exports = mongoose.model('document', DocumentSchema);