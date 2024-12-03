const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Admin = new Schema({
    login: String,
    password: String,
    regionId: {
        type: Schema.Types.ObjectId,
        ref: 'region'
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('admin', Admin);