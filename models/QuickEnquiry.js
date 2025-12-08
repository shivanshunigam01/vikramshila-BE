import mongoose from "mongoose";

const quickEnquirySchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    mobileNumber: { type: String, required: true },

    state: { type: String, required: true },
    city: { type: String, required: true },
    pincode: { type: String, required: true },

    briefDescription: { type: String, required: true },

    consentCall: { type: Boolean, default: false },
    whatsappConsent: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["C0", "NEW", "OPENED", "CONTACTED"],
      default: "C0",
    },
  },
  { timestamps: true }
);

export default mongoose.model("QuickEnquiry", quickEnquirySchema);
