const { receiver } = require('../config');
const { updateMrgOrg } = require('../controllers/AdminSetting');

updateMrgOrg({
    inn: receiver.receiver_inn,
    kpp: receiver.receiver_kpp,
});
