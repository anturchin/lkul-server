const {Consumer} = require('../models');

exports.getSsdUriByCons_UID = async (cons_UID) => {
    const consumer = await Consumer.findOne({cons_UID}).populate('ssdUri');
    return consumer && consumer.ssdUri && consumer.ssdUri.uri ? consumer.ssdUri.uri : null;
};
exports.getSsdUriByConsumer = (consumer) => {
    if (!consumer) {
        return null
    };
    if (!consumer.ssdUri) {
        return null;
    }
    return consumer.ssdUri.uri;
}