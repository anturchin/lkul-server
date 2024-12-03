
require('../db')();
const {Tab} = require('../models');

const a = async () => {
    const tabs = [{
        name: 'workflow',
        read: ['documents', 'login_sbis'],
        write: ['files', 'documents', 'signed_documents', 'remove', 'attachment', 'login_sbis', 'delete']
    }, {
        name: 'payments',
        read: ['unknown_payments', 'payments', 'mets', 'contracts', 'values'],
        write: ['unknown_payments', 'payments', 'mets', 'contracts', 'values', 'confirm']
    }, {
        name: 'meters',
        read: ['export', 'confirm'],
        write: ['import', 'export', 'confirm']
    }, {
        name: 'gasusing',
        read: ['consumers', 'locations', 'contracts', 'gas_equipment_info'],
        write: ['consumers', 'locations', 'contracts', 'gas_equipment_info']
    }, {
        name: 'contracts',
        read: ['contracts', 'balance', 'payments', 'settlement', 'locations', 'gas_equipment_info'],
        write: ['contracts', 'balance', 'payments', 'settlement', 'locations', 'gas_equipment_info']
    }, {
        name: 'card',
        read: ['consumers'],
        write: ['consumers']
    }, {
        name: 'calculations',
        read: ['balance', 'payments', 'contracts', 'settlement'],
        write: []
    }, {
        name: 'autorization',
        read: ['register', 'login', ],
        write: ['register', 'login', 'reset_password', 'change_password']
    }, {
        name: 'analysis',
        read: ['plan', 'fact'],
        write: ['plan', 'fact']
    }];

    for (const tab of tabs) {
        await Tab(tab).save();
    }
    console.log('success');
};

a();