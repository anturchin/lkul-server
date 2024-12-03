const {SuperAdmin, SsdUri} = require('../models');
const jwt = require('../libs/jwt');
const auth = require('vvdev-auth');
const {unauthorized, conflict, badRequest} = require('boom');

exports.login = async (login, password) => {
    const admin = await SuperAdmin.findOne({login});
    if (!admin) throw unauthorized('Auth error');
    const check = await auth.checkPassword(password, admin.password);
    if (!check) throw unauthorized('Auth error');
    const token = await jwt.sign({
        login,
        _id: admin._id
    });
    return {
        token
    };
};

exports.ssdUrlCreate = async (uri, email, title, regionId) => {
    const ssdUri = await SsdUri.findOne({uri});
    if (ssdUri) throw conflict("Такой адрес ссд уже существутет");
    if (!uri) throw badRequest("Uri пустой!");
    if (!email) throw badRequest("Email пустой!");
    if (!title) throw badRequest("Title пустой!");
    if (!regionId) throw badRequest("Region Id пустой!");

    if(email) 
    await SsdUri({
        uri,
        email,
        title,
        regionId
    }).save();
    return {message: 'ok'};
};

exports.getSsdUrls = async (regionId) => {
  const query = {};
  if (regionId) {
    query.regionId = regionId;
  }
  const ssdUrls = await SsdUri.find(query);
  return { ssdUrls };
};

exports.updateSsdUri = async (_id, uri, email, title, regionId) => {
    await SsdUri.updateOne({_id}, {$set: {uri, email, title, regionId}});
    return {message: 'ok'};
};

exports.deleteSsdUri = async (_id) => {
    await SsdUri.deleteOne({_id});
    return {message: 'ok'};
};