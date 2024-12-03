const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Contract = new Schema({
    contr_UID: String,
    cons_UID: String,
    contr_dat: String,
    contr_status: String,
    contr_balance: String,
    contr_st_date: Date,
    contr_end_date: Date,
    Abon_dep: String,
    cur_fio: String,
    cur_phone: String,
    cur_email: String,
    contr_scan: String,
    FZ44: Boolean,
    FZ233: Boolean,
    Budg_ch_contr: String,
    budg_level: String,
    receivers: [String],
    budg_limit: String,
    bufg_type: String,
    budg_contr_price: Number,
    other_contr_price: Number,
    budg_gas_vol: Number,
    other_gas_vol: Number,
    mets: [String],
    Cons_points: [String]
}, {
    timestamps: true
});

module.exports = mongoose.model('contract', Contract);