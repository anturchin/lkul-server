const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ssdUri = new Schema(
  {
    uri: String,
    email: String,
    title: String,
    regionId: {
      type: Schema.Types.ObjectId,
      ref: "region",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ssd_uri", ssdUri);
