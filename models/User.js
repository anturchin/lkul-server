const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
    },
    blocked: {
      type: Boolean,
      default: false,
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

module.exports = mongoose.model("user", UserSchema);
