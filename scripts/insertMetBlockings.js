require("../db")();

const MetBlocking = require("../models/MetBlocking");
const Region = require("../models/Region");

(async () => {
  try {
    const blocking = await MetBlocking.findOne();
    if (blocking) {
      return;
    }
    const region1 = await Region.findOne({name: "Московская область"});
    const region2 = await Region.findOne({name: "Республика Татарстан"});

    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year < currentYear + 3; year++) {
      for (let month = 0; month < 12; month++) {
        await MetBlocking({
          month: month,
          year: year,
          regionId: region1._id,
          date: new Date(year, month, 2, 18, 0, 0).toISOString(),
        });
        await MetBlocking({
          month: month,
          year: year,
          regionId: region2._id,
          date: new Date(year, month, 2, 18, 0, 0).toISOString(),
        });
      }
    }

    console.log("success");
  } catch (err) {
    console.error(err);
  }
})();
