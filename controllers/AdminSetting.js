const { AdminSetting, MrgOrg } = require('../models');

const mapper = (document) => {
    return {
        _id: document._id,
        tokenActivityPeriod: document.tokenActivityPeriod || 10
    };
};

exports.getAdminSetting = async () => {
    const adminSettings = await AdminSetting.findOne();
    return mapper(adminSettings);
};

exports.updateMrgOrg = async (data) => {
    const mrgOrg = await MrgOrg.findOne();
    if (!mrgOrg) {
        await MrgOrg({
            inn: data.inn,
            kpp: data.kpp,
        }).save();
    } else {
        await MrgOrg.updateOne({
            inn: data.inn,
            kpp: data.kpp,
        });
    }
    return {
        data: null,
    };
};

exports.getMrgOrg = async () => {
    const mrgOrg = await MrgOrg.findOne();
    return {
        data: mrgOrg,
    };
};