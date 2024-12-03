const { Router } = require("express");
const router = Router();
const boom = require("boom");
const ContactController = require("../controllers/Contact");
const { checkLKAdminOrSuperAdmin } = require("../libs/jwt");

router.get("/", checkLKAdminOrSuperAdmin, async (req, res, next) => {
  try {
    const { regionId, page, limit } = req.query;
    if (!regionId) {
      throw boom.badRequest("Регион обязателен!");
    }
    const contacts = await ContactController.getList(regionId, page, limit);
    res.send(contacts);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", checkLKAdminOrSuperAdmin, async (req, res, next) => {
  try {
    const { isRegion, emailType } = req.query;
    const { id } = req.params;
    if (!id) {
      throw boom.badRequest("Такого контакта не существует!");
    }
    const contact = await ContactController.getOne(id, isRegion, emailType);
    res.send(contact);
  } catch (error) {
    next(error);
  }
});

router.post("/", checkLKAdminOrSuperAdmin, async (req, res, next) => {
  try {
    const result = await ContactController.save(req.body);
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", checkLKAdminOrSuperAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return boom.badRequest("Пустое поле Id.");
    }

    const result = await ContactController.delete(id);
    res.send(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
