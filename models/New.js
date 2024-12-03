const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    title: String,
    body: String,
    content: String,
    regionId: {
        type: Schema.Types.ObjectId,
        ref: 'region'
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('new', schema);