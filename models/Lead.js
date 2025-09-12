// models/Lead.ts
import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    filename: String,
    originalName: String,
    path: String, // Cloudinary URL if using Cloudinary storage
    size: Number,
    mimetype: String,
  },
  { _id: false }
);

const leadSchema = new mongoose.Schema(
  {
    // Product
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productTitle: { type: String, required: true },
    productCategory: { type: String },

    // Finance
    vehiclePrice: { type: Number, required: true },
    downPaymentAmount: { type: Number, required: true },
    downPaymentPercentage: { type: Number, required: true },
    loanAmount: { type: Number, required: true },
    interestRate: { type: Number, required: true },
    tenure: { type: Number, required: true },
    estimatedEMI: { type: Number, required: true },

    // Status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    // User
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    userPhone: { type: String, required: true },

    // NEW: Optional KYC files
    aadharFile: { type: fileSchema, default: null },
    panCardFile: { type: fileSchema, default: null },
  },
  { timestamps: true }
);

const Lead = mongoose.model("Lead", leadSchema);
export default Lead;
