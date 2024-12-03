const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MetBlocking = new Schema({
    date: Date,
    month: {
        type: Number,
        enum: [
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
        ],
        required: true,
    },
    year: {
        type: Number,
        required: true,
    },
    regionId: {
        type: Schema.Types.ObjectId,
        ref: 'region'
    },
});

module.exports = mongoose.model('met_blocking', MetBlocking);

