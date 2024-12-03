const moment = require('moment');

module.exports = (date, count = 19) => {
    return moment(date).toDate().toISOString().slice(0, count);
};