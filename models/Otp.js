const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    otp: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expireAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index
  },
  { timestamps: true }
);

// TTL: expire documents automatically after "expireAt"
// Note: ensure your MongoDB supports TTL indexes (it does by default)
// Prevent OverwriteModelError
module.exports = mongoose.models.Otp || mongoose.model("Otp", otpSchema);
