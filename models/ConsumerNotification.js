const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const schema = new Schema(
  {
    type: String,
    text: String,
    cons_UIDs: [String],
    sended: {
      type: Boolean,
      default: false,
    },
    users: [String],
    regionId: {
      type: Schema.Types.ObjectId,
      ref: "region",
    },
    allConsumers: Boolean,
  },
  {
    timestamps: true,
    strict: false,
  }
);

module.exports = mongoose.model("consumer_notification", schema);
