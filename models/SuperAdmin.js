const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SuperAdmin = new Schema({
    login: String,
    password: String
}, {
    timestamps: true
});

module.exports = mongoose.model('super_admin', SuperAdmin);