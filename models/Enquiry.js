// models/Enquiry.js
const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    state: { type: String },
    pincode: { type: String },
    product: { type: String },
    briefDescription: { type: String },
    whatsappConsent: { type: Boolean, default: false },
    contacted: { type: Boolean, default: false },

    // Assignment
    assignedToId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedTo: { type: String, default: null },
    assignedToEmail: { type: String, default: null },

    // Status (similar to Lead)
    status: {
      type: String,
      enum: ["C0", "C1", "C2", "C3"],
      default: "C0",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Enquiry", enquirySchema);
