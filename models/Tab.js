const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Tab = new Schema({
    name: String,
    read: [String],
    write: [String]
}, {
    timestamps: true
});

module.exports = mongoose.model('tab', Tab);