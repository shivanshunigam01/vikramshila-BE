const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    icon: { type: String },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);
