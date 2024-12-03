require('../db')();

const { createDefaultRoles } = require('../controllers/UserController');
const {User} = require('../models');

(async () => {
    try {
        const users = await User.find().lean();
        for (const user of users) {
            try {
                await createDefaultRoles(user._id);
            } catch (err) {
                console.error(err);
            }
        }
        console.log('success');
    } catch (err) {
        console.error(err);
    }
})();