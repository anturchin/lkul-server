require('../db')();

const {ConsumerNotification} = require('../models');

(async () => {
    try {
        const consumerNotifications = await ConsumerNotification.find({'users.0': {$exists: true}}).lean();
        for (const cn of consumerNotifications) {
            await ConsumerNotification.updateOne({_id: cn._id}, {$set: {users: cn.users.map(String)}});
        }
        console.log('success');
    } catch (err) {
        console.error(err);
    }
})();