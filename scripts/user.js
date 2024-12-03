require('../db')();
const {SubLogin} = require('../models');
const jwt = require('../libs/jwt');

const a = async () => {
    SubLogin.findOne({_id: '5e9ee573e8a2b202040c9af2'})
        .then(async user => {
            if (!user) return console.error('User not found');
            const token = await jwt.sign({_id: user._id, login: SubLogin.login});
            console.log(token);
        })
        .catch(err => {
            console.error(err);
        });
};

a();