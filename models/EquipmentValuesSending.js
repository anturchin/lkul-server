const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EquipmentValuesSending = new Schema({
}, {
    timestamps: true,
    strict: false
});

module.exports = mongoose.model('equipment_values_sending', EquipmentValuesSending);