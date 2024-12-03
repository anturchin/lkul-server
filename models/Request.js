const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RequestSchema = new Schema({
    email: String,
    type: {
        type: String,
        enum: [
            'reg',
            'login'
        ]
    }, 
    files: [String],
    organizationInn: String, 
    organizationName: String, 
    firstName: String, 
    lastName: String, 
    middleName: String, 
    positionUser: String, 
    phone: String, 
    comment: String
}, {
    timestamps: true
});


module.exports = mongoose.model('request', RequestSchema);