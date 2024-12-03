require('../db')();
const {Role} = require('../models');
const {createRoles} = require('../controllers/UserController');

const a = async () => {
    const roles = [{
        'type': 'Инженер',
        'tabs': [
            {
                'name': 'equipments',
                'read': true,
                'write': false
            },
            {
                'name': 'meters',
                'read': true,
                'write': true
            }
        ]
    }, {
        'type': 'Бухгалтер',
        'tabs': [
            {
                'name': 'settlements',
                'read': true,
                'write': false
            },
            {
                'name': 'contracts',
                'read': true,
                'write': false
            }
        ]
    }, {
        'type': 'Аналитик',
        'tabs': [
            {
                'name': 'statistics',
                'read': true,
                'write': false
            }
        ]
    }, {
        'type': 'Полный доступ',
        'tabs': []
    }, {
        'type': 'Доступ к ЭДО',
        'tabs': [
            {
                'name': 'workflow',
                'read': true,
                'write': true
            }
        ]
    }, {
        'type':'Оплаты',
        'tabs':[
            {
                'name':'payments',
                'read':true,
                'write':true
            }
        ],
    }];
    let uid = null;
    for (const role of roles) {
        const roleCount = await Role.countDocuments({user: null, type: role.type});
        if (roleCount) continue;
        await createRoles(uid, role.type, role.tabs);
    }
    console.log('success');
};

a();