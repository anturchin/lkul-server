require("../../db")();

const SsdUri = require("../../models/SsdUri");
const User = require("../../models/User");
const Consumer = require("../../models/Consumer");

(async () => {
  try {
    const ssdUri = await SsdUri.findOne({ title: "Казань препрод LKKUL1" });
    const users = await User.find();

    for (const user of users) {
      await Consumer.remove({ user: user._id, ssdUri: ssdUri._id });
    }

    console.log("База данных успешно обновлена!");
  } catch (error) {
    console.log("error", error);
    throw new Error(error);
  } finally {
    process.exit(0);
  }
})();
