const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Email = new Schema({
    value: [String]
});

module.exports = mongoose.model('email', Email);