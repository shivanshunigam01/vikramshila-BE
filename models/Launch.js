const mongoose = require("mongoose");

const launchSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    launchDate: { type: Date },
    mediaFiles: [{ type: String }],
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Launch", launchSchema);
