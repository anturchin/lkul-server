const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Location = new Schema({
    'location_uuid': String,
    'contr_UID': String,
    'Location_Name': String,
    'Location_address': String,
    'Mets': [{
        'Met_uuid': String,
        'location_uuid': String,
        'Met_name': String,
        'equipments': [{
            'Met_uuid': String,
            'equipment_uuid': String,
            'Equipment_type': String,
            'Equipment_name': String,
            'serial_number': String,
            'work': Boolean,
            Values: [{
                Dt_value: Date,
                Value: String,
                basis: String
            }]
        }]
    }]
}, {
    timestamps: true
});


module.exports = mongoose.model('location', Location);