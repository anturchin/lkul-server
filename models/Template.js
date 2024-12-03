const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const schema = new Schema({
  type: String,
  text: String,
  regionId: {
    type: Schema.Types.ObjectId,
    ref: "region",
  },
});

module.exports = mongoose.model("template", schema);
