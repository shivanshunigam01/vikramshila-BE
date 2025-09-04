const mongoose = require("mongoose");

const grievanceSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    type: {
      type: String,
      enum: ["complaint", "enquiry", "feedback"], // added feedback
      default: "enquiry",
    },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    whatsappConsent: { type: Boolean, default: false },
    status: { type: String, enum: ["pending", "resolved"], default: "pending" },
    contacted: { type: Boolean, default: false },
    consentCall: { type: Boolean, default: false }, // added consentCall
    state: { type: String }, // added optional state
    pincode: { type: String }, // added optional pincode
  },
  { timestamps: true }
);

module.exports = mongoose.model("Grievance", grievanceSchema);
