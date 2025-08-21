const mongoose = require("mongoose");

const schemeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    photos: [{ type: String }], // store multiple images
    startDate: { type: Date },
    endDate: { type: Date },
    status: { type: String, default: "active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Scheme", schemeSchema);
