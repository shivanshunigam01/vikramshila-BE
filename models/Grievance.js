const mongoose = require("mongoose");

const grievanceUpdateSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ["pending", "in-progress", "resolved"] },
    message: { type: String },
    byUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    byName: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const grievanceSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    type: {
      type: String,
      enum: ["complaint", "enquiry", "feedback"],
      default: "enquiry",
    },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    whatsappConsent: { type: Boolean, default: false },
    consentCall: { type: Boolean, default: false },
    state: { type: String },
    pincode: { type: String },
    status: {
      type: String,
      enum: ["pending", "in-progress", "resolved"],
      default: "pending",
    },
    grievanceUpdates: [grievanceUpdateSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Grievance", grievanceSchema);
