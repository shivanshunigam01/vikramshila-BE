const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    videoUrl: { type: String, required: true }, // YouTube/Vimeo link
    status: {
      type: String,
      enum: ["pending", "published"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Video", videoSchema);
