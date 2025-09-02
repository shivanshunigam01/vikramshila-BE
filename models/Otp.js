const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 }, // auto-delete in 5 mins
});

// Prevent OverwriteModelError
module.exports = mongoose.models.Otp || mongoose.model("Otp", otpSchema);
