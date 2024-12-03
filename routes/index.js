const { Router } = require('express');
const router = Router();

router.use('/regions', require('./regions'));
router.use('/users', require('./users'));
router.use('/files', require('./files'));
router.use('/contacts', require('./contacts'));
router.use('/contracts', require('./contracts'));
router.use('/consumers', require('./consumers'));
router.use('/equipments', require('./equipments'));
router.use('/locations', require('./locations'));
router.use('/tabs', require('./tabs'));
router.use('/notifications', require('./notifications'));
router.use('/appeals', require('./appeals'));
router.use('/super_admins', require('./superAdmin'));
router.use('/curators', require('./curators'));
router.use('/admins', require('./admins'));
router.use('/news', require('./news'));
router.use('/block_themes', require('./blockThemes'));
router.use('/orders', require('./orders'));
router.use('/tickets', require('./tickets'));
router.use('/mets', require('./mets'));

module.exports = router;
