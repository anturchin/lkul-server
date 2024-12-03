const {Ticket} = require('../models');
const ticket = require('../libs/ticket');
const qPromConsumerInfo = require('../requests/qPromConsumerInfo');
const { getSsdUriByCons_UID } = require('../libs/getSsdUriByConsumer');

module.exports = class TicketController {
    static async createTicket(subLogin = {}, {email, summary, description, params, attachments, cons_inn, cons_kpp, cons_name}) {
        const {cons_UID} = subLogin;
        let consumerInfo = null;
        if (cons_UID) {
            const uri = await getSsdUriByCons_UID(cons_UID);
            consumerInfo = await qPromConsumerInfo(cons_UID, uri);
        }
        let result = await Ticket({
            email,
            cons_UID,
            summary,
            description,
            user: subLogin.user ? subLogin.user._id : null,
            subLogin: subLogin._id,
            params,
        }).save();

        result = result.toObject();
        result.attachments = attachments;
        const consumerData = {};
        if (consumerInfo) {
            consumerData.inn = consumerInfo.cons_INN || consumerInfo.cons_inn;
            consumerData.kpp = consumerInfo.cons_KPP || consumerInfo.cons_kpp;
            consumerData.cons_name = consumerInfo.cons_short_name;
        } else {
            consumerData.inn = cons_inn;
            consumerData.kpp = cons_kpp;
            consumerData.cons_name = cons_name;
        }
        const {exKey, exId} = await ticket.sendToServiceDesk(result, consumerData);

        await Ticket.updateOne({_id: result._id}, {$set: {exId, exKey}});

        return {
            data: result,
        };
    }
};