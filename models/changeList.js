const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const changeList = new Schema({
    id: String,
    cons_inn: String,
    cons_kpp: String,
    counter: Number,
    subLogin: {
        type: Schema.Types.ObjectId,
        ref: 'sub_login'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('change_list', changeList);