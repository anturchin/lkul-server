const {Router} = require('express');
const { createBlockTheme, getBlockThemes, getBlockThemeById, updateBlockById, deleteBlockById } = require('../controllers/BlockThemeController');
const { checkLKAdmin, checkLKAdminOrCuratorOrUser, checkLKAdminOrSuperAdmin, checkLKAdminOrCuratorOrUserOrSuperUser } = require('../libs/jwt');
const router = Router();

router.post('/', checkLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const {title, text, emails, phones, onlyConfirmUsers, regionId} = req.body;
        const result = await createBlockTheme(title, text, emails, phones, onlyConfirmUsers, regionId);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/', checkLKAdminOrCuratorOrUserOrSuperUser, async (req, res, next) => {
    try {
        const {page, limit, regionId} = req.query;
        const result = await getBlockThemes(page, limit, regionId);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.get('/:id', checkLKAdminOrCuratorOrUserOrSuperUser, async (req, res, next) => {
    try {
        const result = await getBlockThemeById(req.params.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.put('/:id', checkLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const {title, text, emails, phones, onlyConfirmUsers, regionId} = req.body;
        const result = await updateBlockById(req.params.id, title, text, emails, phones, onlyConfirmUsers, regionId);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

router.delete('/:id', checkLKAdminOrSuperAdmin, async (req, res, next) => {
    try {
        const result = await deleteBlockById(req.params.id);
        res.send(result);
    } catch (err) {
        next(err);
    }
});

module.exports = router;