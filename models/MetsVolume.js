const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MetsVolume = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    cons_UID: String,
    date: Date,
    planVolume: Number,
    factVolume: Number,
    contr_UID: String
}, {
    timestamps: true
});

module.exports = mongoose.model('mets_volume', MetsVolume);