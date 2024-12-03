require('../db')();
const Curator = require('../models/Curator');
const Region = require('../models/Region');
const auth = require('vvdev-auth');

const a = async () => {
    const password = 'G3Dvf5^n';
    const hash = await auth.hashPassword(password);
    const region1 = await Region.findOne({name: "Московская область"});
    const region2 = await Region.findOne({name: "Республика Татарстан"});

    await Curator({
        password: hash,
        login: "CuratorMSK",
        email: 'a123@pp.com',
        regionId: region1._id
    }).save();
    await Curator({
        password: hash,
        login: "CuratorKZN",
        email: 'a124@pp.com',
        regionId: region2._id
    }).save();
    
    console.log('success curator');
};

a();