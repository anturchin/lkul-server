const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Curator = new Schema(
  {
    login: String,
    password: String,
    email: String,
    phone: String,
    position: String,
    blocked: Boolean,
    tabs: [
      {
        name: String,
        write: Boolean,
        read: Boolean,
      },
    ],
    firstName: String,
    lastName: String,
    middleName: String,
    regionId: {
      type: Schema.Types.ObjectId,
      ref: "region",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("curator", Curator);
