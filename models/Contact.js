const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ContactSchema = new Schema(
  {
    email: {
      type: String,
    },
    phone: {
      type: String,
    },
    title: {
      type: String,
    },
    regionId: {
      type: Schema.Types.ObjectId,
      ref: "region",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("contact", ContactSchema);
