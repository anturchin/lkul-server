require("../../db")();
const Consumer = require("../../models/Consumer");
const SsdUri = require("../../models/SsdUri");

(async () => {
  try {
    const ssdUrisCount = await SsdUri.countDocuments();
    if (!ssdUrisCount) {
      console.log(
        "Нет подключенных СИД, а без них не заработает."
      );
      return;
    }

    const consumers = await Consumer.find({}).populate("ssdUri");
    const ssdUri = await SsdUri.findOne();
    for (const consumer of consumers) {
      if (!consumer.ssdUri || (consumer.ssdUri && !consumer.ssdUri.uri)) {
        await Consumer.update(
          { _id: consumer._id },
          { $set: { ssdUri: ssdUri._id } }
        );
        console.log(
          `У консалмера ${consumer._id} нет подключеного СИДа. Пустой СИД будет изменен на СИД по умолчанию.`
        );
      }
    }
  } catch (error) {
    console.log("error", error);
    throw new Error(error);
  } finally {
    console.log("База данных успешно обновлена!");
    process.exit(0);
  }
})();
