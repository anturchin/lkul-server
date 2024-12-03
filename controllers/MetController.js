// const rights = require('../libs/rights');
const { badRequest, conflict } = require('boom');
const { MetBlocking } = require('../models');
const moment = require('moment');
const Region = require('../models/Region');

exports.updateMetBlocking = async (data) => {
    const {datesForMonth, regionId, isEnabled} = data;
    if (!regionId) {
        throw badRequest('Некорректные данные: ', regionId);
    }
    await Region.update(
      { _id: regionId },
      { $set: { isEnabledMetBlockings: isEnabled || false } }
    );

    for (const {month, year, date} of datesForMonth) {
        if (!month || !year || !date) throw badRequest('Некорректные данные: ', month, year, date);
        const query = { month, year };
        if (regionId) {
            query.regionId = regionId;
        }
        const metBlocking = await MetBlocking.findOne(query);
        if (!metBlocking) {
            await MetBlocking({
                month, year, date, regionId
            }).save();
        } else {
            const newData = {date}
            if (regionId) {
                newData.regionId = regionId;
            }
            await MetBlocking.updateOne({_id: metBlocking._id}, {$set: newData});
        }
    }

    return {
        data: null,
    };
};

exports.getMetBlockings = async (query = {year: null, regionId: null}) => {
    if (!query.regionId) throw badRequest('Нужно выбрать регион');
    if (!query.year) query.year = moment().year();
    
    const newQuery = {year: query.year, regionId: query.regionId};
    
    const metBlockings = await MetBlocking.find(newQuery);
    const region = await Region.findOne({_id: query.regionId});
    if (!region) {
        throw badRequest('Регион не найден')
    };

    const result = {};
    for (const metBlocking of metBlockings) {
        const key = metBlocking.month;
        result[key] = metBlocking.date;
    }
    for (const key in Array.from({length: 12}, (_v, i) => i)) {
        if (!result[key]) {
            result[key] = moment().month(Number(key)).year(query.year).add(1, 'month').startOf('month').add(1, 'days').hours(15).minutes(0).seconds(0);
        } else {
            result[key] = moment(result[key]);
        }
    }
    return {
        data: result,
        isEnabled: region.isEnabledMetBlockings,
    };
};

exports.getMetBlockingDate = async (date) => {
    const currentDate = new Date();
    const blockDate = await exports.getMetBlockLikeDate(date);
    if (moment(blockDate).isBefore(currentDate)) throw conflict('Срок передачи показаний до ' + moment(blockDate).add(3, 'hours').format('DD.MM.YYYY, HH:mm'));
    return;
};

exports.getMetBlockLikeDate = async (date = new Date()) => {
    const currentDate = new Date();
    const month = moment(date).month();
    const year = moment(date).year();
    const metBlocking = await MetBlocking.findOne({
        month,
        year,
    });
    let blockDate = moment(currentDate).add(1, 'month').day(2).hours(18).minutes(0).seconds(0);
    if (metBlocking) {
        blockDate = moment(metBlocking.date);
    }
    return blockDate;
};