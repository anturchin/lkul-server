const { notFound } = require('boom');
const pageLimitPagination = require('../libs/pageLimitPagination');
const BlockTheme = require('../models/BlockTheme');

exports.createBlockTheme = async (title, text, emails, phones, onlyConfirmUsers, regionId) => {
    await BlockTheme({
        emails,
        phones,
        text,
        title,
        onlyConfirmUsers,
        regionId
    }).save();
    return {message: 'ok'};
};

exports.getBlockThemes = async (page, limit, regionId) => {
    ({page, limit} = pageLimitPagination(page, limit));
    const skip = limit * (page - 1);
    const query = {}
    if (regionId) {
        query.regionId = regionId;
    }
    const [blockThemes, count] = await Promise.all([
        BlockTheme.find(query).limit(limit).skip(skip),
        BlockTheme.countDocuments(query)
    ]);
    return {blockThemes, count};
};

exports.getBlockThemeById = async (_id) => {
    const blockTheme = await BlockTheme.findById(_id);
    if (!blockTheme) throw notFound('Block theme not found');
    return {blockTheme};
};

exports.updateBlockById = async (_id, title = '', text = '', emails = [], phones = [], onlyConfirmUsers, regionId) => {
    await exports.getBlockThemeById(_id);
    const data = {title, text, emails, phones, onlyConfirmUsers, regionId};
    await BlockTheme.updateOne({_id}, {$set: data});
    return {message: 'ok'};
};

exports.deleteBlockById = async (_id) => {
    await exports.getBlockThemeById(_id);
    await BlockTheme.deleteOne({_id});
    return {message: 'ok'};
};
