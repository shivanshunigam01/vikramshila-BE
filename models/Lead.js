// models/Lead.js
import mongoose from "mongoose";

const mapLegacyStatus = (val) => {
  if (!val) return val;
  const key = String(val).toLowerCase();
  const legacy = {
    pending: "C0",
    quotation: "C1",
    rejected: "C2",
    approved: "C3",
  };
  return legacy[key] || val; // if already C0..C3, keep it
};

const DseUpdateSchema = new mongoose.Schema(
  {
    byUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    byName: String,
    message: String,
    statusFrom: String,
    statusTo: String,
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } }
);

const fileSchema = new mongoose.Schema(
  {
    filename: String,
    originalName: String,
    path: String,
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

    status: {
      type: String,
      enum: ["C0", "C1", "C2", "C3"],
      default: "C0",
      set: mapLegacyStatus, // 👈 map legacy -> new BEFORE validation
    },

    // Assignment (used by /leads/assign and FE UI)
    assignedTo: { type: String, default: null }, // ← NEW
    assignedToId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedToEmail: String,

    // NEW: DSE activity trail
    dseUpdates: [DseUpdateSchema],

    // User
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    userPhone: { type: String, required: true },

    // KYC
    aadharFile: { type: fileSchema, default: null },
    panCardFile: { type: fileSchema, default: null },
    aadharNumber: { type: Number, default: null },
    panNumber: { type: String, default: null },
  },
  { timestamps: true }
);

const Lead = mongoose.model("Lead", leadSchema);
export default Lead;
