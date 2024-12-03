const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TermOfUse = new Schema({
    fileName: String
}, {
    timestamps: true
});

module.exports = mongoose.model('term_of_use', TermOfUse);