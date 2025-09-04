const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    state: { type: String },
    pincode: { type: String },
    product: { type: String },
    briefDescription: { type: String }, // ✅ Added field
    whatsappConsent: { type: Boolean, default: false },
    contacted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Enquiry", enquirySchema);
