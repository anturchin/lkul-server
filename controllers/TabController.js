const {Tab} = require('../models');

exports.getTabs = async () => {
    const tabs = await Tab.find();
    return {tabs};
};  