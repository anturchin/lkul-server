const { Router } = require("express");
const router = Router();
const logoUpload = require("../libs/logoUpload");
const { badRequest, notFound } = require("boom");
const { checkLKAdmin, getUser, checkSuperAdmin } = require("../libs/jwt");
const RegionController = require("../controllers/Regions");
const Region = require("../models/Region");
const Admin = require("../controllers/Admin");
const { ObjectId } = require("mongodb");

router.post(
  "/:id/logo",
  checkSuperAdmin,
  logoUpload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file || !req.file.filename) throw badRequest("Отсутствует файл");
      if (!req.params.id) throw badRequest("Отсутствует id региона");

      const newRegion = await Region.findOneAndUpdate(
        { _id: req.params.id },
        { $set: { logo: req.file.filename } },
        { new: true }
      );
      res.send(newRegion);
    } catch (err) {
      next(err);
    }
  }
);

router.get("/", async (req, res, next) => {
  try {
    const regions = await RegionController.getAll();
    const newRegions = [];
    for (const region of regions) {
      const { admin } = await Admin.getByRegionId(region._id);
      newRegions.push({ ...region._doc, admin });
    }
    res.send(newRegions);
  } catch (err) {
    next(err);
  }
});


router.get("/compact", async (req, res) => {
  try {
    const regions = await RegionController.getAll();
    const newRegions = [];
    for (const region of regions) {
      const newRegion = {
        _id: region._doc._id,
        name: region._doc.name,
        logo: region._doc.logo,
        contacts: region._doc.contacts,
      };
      newRegions.push(newRegion);
    }
    res.send(newRegions);
  } catch (err) {
    next(err);
  }
});

router.get("/current", getUser, async (req, res, next) => {
  try {
    const { regionId } = req.authData;
    const region = await Region.findOne({ _id: regionId });
    res.send(region);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  const { id } = req.params;

  try {
    if (!id) {
      throw badRequest("Пустое id региона!");
    }
    const result = await RegionController.getById(id);
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.post("/", checkSuperAdmin, async (req, res, next) => {
  try {
    if (!req.body) {
      throw badRequest("Пустое тело запроса!");
    }
    const newRegion = await RegionController.save(req.body);
    return res.send(newRegion);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", checkSuperAdmin, async (req, res, next) => {
  try {
    const result = await RegionController.save(req.body);
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", checkSuperAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw badRequest("Пустое id региона!");
    }
    await RegionController.delete(id);
    res.send({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/admin", checkSuperAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw badRequest("Пустое id региона!");
    }
    const { admin } = await Admin.getByRegionId(id);
    if (!admin) {
      throw notFound("Admin not found");
    }
    res.send(admin);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
