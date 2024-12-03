const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MrgOrg = new Schema({
    inn: String,
    kpp: String,
});

module.exports = mongoose.model('mrg_org', MrgOrg);

