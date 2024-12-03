const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Question = new Schema(
  {
    category: String,
    text: String,
    answer: String,
    regionId: {
      type: Schema.Types.ObjectId,
      ref: "region",
    },
    isCreatedByAdmin: {
      type: Boolean,
      default: false,
    },
    isCreatedBySuperAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("question", Question);
