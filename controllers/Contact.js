const boom = require("boom");
const pagination = require("../libs/pagination");
const Contact = require("../models/Contact");
const Region = require("../models/Region");

const regionContactsTitleByTypeMap = {
  consumerAdministration: "Управление по работе с потребителями газа",
  communityAdministration: "Управление по работе с населением",
};

exports.getList = async (regionId, page = 1, limit = 20) => {
  page = page ? parseInt(page) : 1;
  limit = limit ? parseInt(limit) : 20;
  if (!limit || limit < 2) limit = 20;
  if (!page || page < 1) page = 1;
  const contactsLimit = page === 1 ? limit - 2 : limit;
  const skip = (page - 1) * contactsLimit;

  let contacts = [];
  const contactsLength = await Contact.countDocuments({ regionId });
  if (contactsLimit > 0) {
    contacts = await Contact.find({ regionId })
      .limit(contactsLimit)
      .skip(skip)
      .sort({ createdAt: -1 })
      .lean();
  }

  const region = await Region.findOne({ _id: regionId });
  if (!region) {
    throw boom.notFound("Регион не найден.");
  }

  const regionContacts = [
    {
      email: region.contacts.consumerAdministration.email,
      phone: region.contacts.consumerAdministration.phone,
      type: "consumerAdministration",
      regionId,
      title: regionContactsTitleByTypeMap.consumerAdministrationEmail,
      isRegion: true,
    },
    {
      email: region.contacts.communityAdministration.email,
      phone: region.contacts.communityAdministration.phone,
      type: "communityAdministration",
      regionId,
      title: regionContactsTitleByTypeMap.communityAdministrationEmail,
      isRegion: true,
    },
  ];

  let data = [];
  if (page === 1) {
    data = [...regionContacts, ...contacts];
  } else {
    data = [...contacts];
  }

  return {
    data,
    pagination: pagination(limit, page, parseInt(contactsLength + 2)),
  };
};

exports.save = async ({
  _id,
  email,
  phone,
  title,
  regionId,
  isRegion,
  type,
}) => {
  if (isRegion) {
    return saveRegionContacts({ email, phone, regionId, type });
  }

  return saveContact({ _id, email, phone, title, regionId });
};

exports.getOne = async (_id, isRegion, type) => {
  if (isRegion) {
    const region = await Region.findOne({ _id });
    if (!region) {
      throw boom.notFound("Такого региона не существует!");
    }
    return {
      email: region.contacts[type].email,
      phone: region.contacts[type].phone,
      type: type,
      regionId: _id,
      title: regionContactsTitleByTypeMap[type],
      isRegion: true,
    };
  }

  return Contact.findOne({ _id });
};

exports.delete = (id) => {
  return Contact.deleteOne({ _id: id });
};

async function saveRegionContacts({ email, phone, regionId, type }) {
  const region = await Region.findOne({ _id: regionId });
  region.contacts[type].email = email;
  region.contacts[type].phone = phone;

  await Region.updateOne({ _id: regionId }, region);

  return {
    email,
    phone,
    type,
    regionId,
    title: regionContactsTitleByTypeMap[type],
    isRegion: true,
  };
}

async function saveContact({ _id, email, phone, title, regionId }) {
  let contact = null;
  const findedContact = await Contact.findOne({ _id });

  if (!findedContact) {
    contact = await Contact.create({ email, phone, title, regionId });
  } else {
    const data = {};
    if (email) {
      data.email = email;
    }
    if (phone) {
      data.phone = phone;
    }
    if (title) {
      data.title = title;
    }
    if (regionId) {
      data.regionId = regionId;
    }

    contact = await Contact.findOneAndUpdate({ _id }, { $set: data });
  }

  return contact;
}
