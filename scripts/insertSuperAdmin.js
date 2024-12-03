require('../db')();
const SuperAdmin = require('../models/SuperAdmin');
const auth = require('vvdev-auth');

const a = async () => {
    const login = 'AdminGas';
    const password = 'a2lskdOasd1asdi8dunjwk';
    const hash = await auth.hashPassword(password);
    await SuperAdmin({
        password: hash,
        login
    }).save();
    console.log('success');
};

a();