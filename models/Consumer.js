const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConsumerSchema = new Schema({
    cons_UID: {
        type: String
    },
    user: {
        type: Schema.Types.ObjectId
    },
    cons_inn: {
        type: String
    },
    cons_kpp: {
        type: String
    },
    cons_full_name: String,
    files: [{
        fileType: String,
        fileName: String
    }],
    email: String,
    lkp: String,
    ssdUri: {
        type: Schema.Types.ObjectId,
        ref: 'ssd_uri'
    },
    blocked: {
        type: Boolean,
        default: false
    },
    name: String
}, {
    timestamps: true
});

module.exports = mongoose.model('consumer', ConsumerSchema);