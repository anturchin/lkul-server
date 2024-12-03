const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Role = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    type: String,
    tabs: [{
        name: String,
        write: Boolean,
        read: Boolean
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('role', Role);