require('../db')();

const User = require('../models/User');
const Consumer = require('../models/Consumer');
const SubLogin = require('../models/SubLogin');
const Role = require('../models/Role');

const a = async () => {
    await Promise.all([
        User.deleteMany({}),
        Consumer.deleteMany({}),
        SubLogin.deleteMany({}),
        Role.deleteMany({})
    ]);
    console.log('success');
};

a();