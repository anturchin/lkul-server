const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubLogin = new Schema({
    type: {
        type: String
    },
    roleIds: {
        type: [Schema.Types.ObjectId],
        ref: 'role'
    },
    roles: [String],
    firstName: String,
    lastName: {
        type: String
    },
    termOfUse: Boolean,
    middleName: String,
    tabs: [{
        name: String,
        write: Boolean,
        read: Boolean
    }],
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    email: String,
    login: String,
    password: String,
    authLink: {
        str: String,
        date: Date
    },
    contracts: [String],
    locations: [String],
    mets: [String],
    equipments: [String],
    consumers: [String],
    blocked: {
        type: Boolean,
        default: false
    },
    authBlockedCount: Number,
    authBlockedDate: Date,
    position: String
}, {
    timestamps: true
});

module.exports = mongoose.model('sub_login', SubLogin);