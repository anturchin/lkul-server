const {Notification} = require('../models');

exports.update = async (subLogin, cons_UID, emails, phones, sendEmail, sendPhone) => {
    const notification = await exports.get(subLogin, cons_UID);
    if (emails) notification.emails = emails;
    if (phones) notification.phones = phones;
    if (sendEmail === true || sendEmail === false) notification.sendEmail = sendEmail;
    if (sendPhone === true || sendPhone === false) notification.sendPhone = sendPhone;
    await notification.save();
    return {message: 'ok'};
};

exports.getList = async (subLogin, cons_UID) => {
    const query = {};
    if (subLogin) query.user = subLogin.user._id;
    if (cons_UID) query.cons_UID = cons_UID;
    const notifications = await Notification.find(query)
      .populate("user")
      .lean();
    return notifications.filter(
      (n) => n.user.regionId.toString() == subLogin.user.regionId.toString()
    );
};

exports.get = async (subLogin, cons_UID) => {
    let notification = await Notification.findOne({user: subLogin.user._id, cons_UID});
    if (!notification) {
        notification = new Notification({
            user: subLogin.user._id, 
            cons_UID, 
            emails: [], 
            phones: [], 
            sendEmail: false,
            sendPhone: false
        });
        await notification.save();
    }
    return notification;
};