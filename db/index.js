const mongoose = require('mongoose');
const {db} = require('../config');

module.exports = () => {
    mongoose.Promise = global.Promise;
    mongoose.connect(`mongodb://${db.uri || 'localhost'}:${db.port || 27017}/${db.db_name || 'gas'}`, { useNewUrlParser: true, useUnifiedTopology: true});
    mongoose.set('useCreateIndex', true);
};