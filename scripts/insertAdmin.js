require("../db")();
const Admin = require("../models/Admin");
const Region = require("../models/Region");
const auth = require("vvdev-auth");

const a = async () => {
  const password = "a2lskdOasd1asdi8dunjwk";
  const hash = await auth.hashPassword(password);

  const loginMsk = "AdminMSK";
  const regionMsk = await Region.findOne({ name: "Московская область" });
  await Admin({
    password: hash,
    login: loginMsk,
    regionId: regionMsk._id,
  }).save();

  const loginKzn = "AdminKZN";
  const regionKzn = await Region.findOne({ name: "Республика Татарстан" });
  await Admin({
    password: hash,
    login: loginKzn,
    regionId: regionKzn._id,
  }).save();
  console.log("success admins");
};

a();
