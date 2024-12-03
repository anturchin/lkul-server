const {AdminSetting} = require('../models');
const TOKEN_ACTIVITY_PERIOD = process.env.TOKEN_ACTIVITY_PERIOD || 10;

require('../db')();

(async () => {
    const adminSettings = await AdminSetting.findOne();
    if (!adminSettings) {
        await AdminSetting({
            tokenActivityPeriod: parseInt(TOKEN_ACTIVITY_PERIOD)
        }).save();
    } else {
        await AdminSetting.updateOne({_id: adminSettings._id}, {$set: {tokenActivityPeriod: parseInt(TOKEN_ACTIVITY_PERIOD)}});
    }

    console.log('SUCCESS');
})();