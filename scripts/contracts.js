require('../db')();
const {Contract, Consumer} = require('../models');
const qPromConsumerContractList = require('../requests/qPromConsumerContractList');
const qPromConsumerContractInfo = require('../requests/qPromConsumerContractInfo');
const { getSsdUriByConsumer } = require('../libs/getSsdUriByConsumer');

function contracts() {
    return Consumer.find()
        .populate('ssdUri')
        .then(async consumers => {
            for (const consumer of consumers) {
                const cons_UID = consumer.cons_UID;
                const uri = getSsdUriByConsumer(consumer);
                const contracts = await qPromConsumerContractList(cons_UID, null, uri);
                for (const contract of contracts) {
                    try {
                        const contr = await qPromConsumerContractInfo(contract.contr_UID, uri);
                        if (contr && contr.Mets) console.log(await Contract({
                            cons_UID,
                            contr_UID: contract.contr_UID,
                            mets: contr.Mets.map(m => m.met_UID)
                        }).save());
                    } catch (err) {
                        // console.error(err.message);
                    }
                }
            }
        });
}
contracts();