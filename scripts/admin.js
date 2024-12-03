require('../db')();
const {Admin} = require('../models');
const jwt = require('../libs/jwt');

const a = async () => {
    Admin.findOne({})
        .then(async admin => {
            if (!admin) return console.error('User not found');
            const token = await jwt.sign({_id: admin._id, login: admin.login});
            console.log(token);
        })
        .catch(err => {
            console.error(err);
        });
};

a();