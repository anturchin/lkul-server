const moment = require('moment');

module.exports = (day, success_date_object = null) => {
    if ((moment(day).diff(moment().add(-1, 'month').startOf('month'), 'seconds') < 0 || moment(day).diff(moment().endOf('month'), 'seconds') > 0) || (moment(new Date()).diff(moment().startOf('month').add(2, 'days'), 'seconds') > 0 && (moment(day).diff(moment().startOf('month'), 'seconds') < 0 || moment(day).diff(moment().endOf('month'), 'seconds') > 0))) return false;
    if (success_date_object) {
        if (!success_date_object[moment(day).startOf('day').toISOString()]) return false;
    }
    return true;
};