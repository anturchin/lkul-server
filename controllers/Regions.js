const { conflict } = require("boom");

const Region = require("../models/Region");
const User = require("../models/User");
const SsdUri = require("../models/SsdUri");
const config = require("../config");

exports.getAll = () => Region.find({}).populate("ssdUri");

/**
 *
 * @param {String} id
 * @returns {Region} region
 */
exports.getById = (id) => Region.findOne({ _id: id }).populate("ssdUri");

/**
 *
 * @param {Region} region
 * @returns {Region} new/updated region
 */
exports.save = async (body) => {
  const region = getRegionFromBody(body);
  const findedSsdUri = await SsdUri.findOne({ _id: region.ssdUri._id });
  let ssdUri = null;
  if (findedSsdUri) {
    ssdUri = await SsdUri.findOneAndUpdate(
      { _id: region.ssdUri._id },
      {
        $set: {
          email: region.ssdUri.email,
          uri: region.ssdUri.uri,
          regionId: region._id,
        },
      },
      { new: true }
    );
  } else {
    const tempSsd = { ...region.ssdUri, regionId: region._id };
    delete tempSsd._id;
    ssdUri = await SsdUri(tempSsd).save();
  }

  region.ssdUri = ssdUri;

  return region._id ? editRegion(region) : saveRegion(region);
};

/**
 *
 * @param {String} id
 * @returns
 */
exports.delete = async (id) => {
  const usersWithRegion = await User.countDocuments({ regionId: id });
  if (usersWithRegion) {
    throw conflict("У данного региона есть пользователи. Удаление запрещено.");
  }

  return Region.deleteOne({ _id: id });
};

function getRegionFromBody(body) {
  return {
    _id: body._id,
    fullName: body.fullName || "empty full name",
    name: body.name || "empty",
    pay: {
      typePaymentCode:
        body.pay && body.pay.typePaymentCode
          ? body.pay.typePaymentCode
          : "40001",
      lspu: body.pay && body.pay.lspu ? body.pay.lspu : "4689519",
      pointCode: body.pay && body.pay.pointCode ? body.pay.pointCode : "11111",
      abonentId:
        body.pay && body.pay.abonentId ? body.pay.abonentId : "46898519",
      idpu: body.pay && body.pay.idpu ? body.pay.idpu : "40001",
      service: body.pay && body.pay.service ? body.pay.service : "4011",
      merchant: body.pay && body.pay.merchant ? body.pay.merchant : "",
      equiring: body.pay && body.pay.equiring ? body.pay.equiring : "",
      gateUrl: body.pay && body.pay.gateUrl ? body.pay.gateUrl : "",
      documentCreateUri:
        body.pay && body.pay.documentCreateUri
          ? body.pay.documentCreateUri
          : config.payment.documentCreateUri,
      inn: body.pay && body.pay.inn ? body.pay.inn : config.payment.paymentInn,
      apiKey:
        body.pay && body.pay.apiKey ? body.pay.apiKey : config.payment.apiKey,
    },
    contacts: {
      consumerAdministration: {
        email:
          body.contacts &&
          body.contacts.consumerAdministration &&
          body.contacts.consumerAdministration.email
            ? body.contacts.consumerAdministration.email
            : "consumerAdministrationEmail@gmail.com",
        phone:
          body.contacts &&
          body.contacts.consumerAdministration &&
          body.contacts.consumerAdministration.phone
            ? body.contacts.consumerAdministration.phone
            : "299 99 99",
      },
      communityAdministration: {
        email:
          body.contacts &&
          body.contacts.communityAdministration &&
          body.contacts.communityAdministration.email
            ? body.contacts.communityAdministration.email
            : "communityAdministrationEmail@gmail.com",
        phone:
          body.contacts &&
          body.contacts.communityAdministration &&
          body.contacts.communityAdministration.phone
            ? body.contacts.communityAdministration.phone
            : "299 99 99",
      },
      support: {
        email:
          body.contacts && body.contacts.support && body.contacts.support.email
            ? body.contacts.support.email
            : "supportEmail@gmail.com",
        phone:
          body.contacts && body.contacts.support && body.contacts.support.phone
            ? body.contacts.support.phone
            : "299 99 99",
      },
    },
    ssdUri: {
      _id: body.ssdUri && body.ssdUri._id ? body.ssdUri._id : null,
      email: body.ssdUri && body.ssdUri.email ? body.ssdUri.email : "",
      uri: body.ssdUri && body.ssdUri.uri ? body.ssdUri.uri : "",
    },
    inn: body.inn || "",
    kpp: body.kpp || "",
    isEnabledMetBlockings: body.isEnabledMetBlockings || false,
    isEnablePayment: body.isEnablePayment || false,
  };
}

function getOnlyRegion(tempRegion) {
  const ssdUri = tempRegion.ssdUri._id || null;

  return {
    fullName: tempRegion.fullName,
    name: tempRegion.name,
    pay: { ...tempRegion.pay },
    inn: tempRegion.inn,
    kpp: tempRegion.kpp,
    ssdUri: ssdUri,
    isEnabledMetBlockings: tempRegion.isEnabledMetBlockings,
    isEnablePayment: tempRegion.isEnablePayment,
    contacts: { ...tempRegion.contacts },
  };
}

async function saveRegion(tempRegion) {
  const newRegion = await Region(getOnlyRegion(tempRegion)).save();
  return exports.getById(newRegion._id);
}

async function editRegion(tempRegion) {
  const updatedRegion = await Region.findOneAndUpdate(
    { _id: tempRegion._id },
    getOnlyRegion(tempRegion),
    { new: true }
  );
  return exports.getById(updatedRegion._id);
}
