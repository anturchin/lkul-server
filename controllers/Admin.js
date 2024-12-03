const Admin = require("../models/Admin");
const jwt = require("../libs/jwt");
const auth = require("vvdev-auth");
const { unauthorized, badRequest, conflict } = require("boom");

exports.login = async (login, password) => {
  if (!login) throw badRequest("Введите логин");
  const loginReg = new RegExp(`^${login}$`, "gi");
  const admin = await Admin.findOne({ login: loginReg });
  if (!admin)
    throw unauthorized("Проверьте правильность ввода логина и пароля");
  const check = await auth.checkPassword(password, admin.password);
  if (!check)
    throw unauthorized("Проверьте правильность ввода логина и пароля");
  const token = await jwt.sign({
    login,
    _id: admin._id,
    regionId: admin.regionId,
  });
  return {
    token,
    type: "lkAdmin",
  };
};

exports.getById = async (id) => {
  const admin = await Admin.findById(id);
  if (!admin) throw notFound("Admin not found");
  return { admin };
};

exports.getByRegionId = async (id) => {
  const admin = await Admin.findOne({ regionId: id }, { password: 0 });
  return { admin };
};

exports.create = async (login, password, repeatPassword, regionId) => {
  const check = password === repeatPassword;
  if (!check) {
    throw conflict("Введенные пароли не совпадают");
  }
  const existsAdmin = await Admin.findOne({ login });
  if (existsAdmin) {
    throw conflict("Администратор с такими данными уже существует");
  }
  const hash = await auth.hashPassword(password);
  const addedAdmin = await Admin({ login, password: hash, regionId }).save();
  delete addedAdmin._doc.password;
  return addedAdmin;
};

exports.updateById = async (_id, login, password, repeatPassword, regionId) => {
  await exports.getById(_id);
  const data = {};

  if (password) {
    if (password !== repeatPassword) {
      throw conflict("Введенные пароли не совпадают");
    }

    const hash = await auth.hashPassword(password);
    data.password = hash;
  }

  if (regionId) {
    data.regionId = regionId;
  }
  if (login) {
    data.login = login;
  }
  return Admin.findOneAndUpdate(
    { _id },
    { $set: data },
    { new: true, projection: { password: 0 } }
  );
};

exports.delete = async (id) => {
  await exports.getById(id);
  await Admin.deleteOne({ _id: id });
  return { message: "ok" };
};
