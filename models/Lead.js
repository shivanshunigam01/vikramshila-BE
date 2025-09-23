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
    /* -------- Product -------- */
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productTitle: { type: String, required: true },
    productCategory: { type: String },

    /* -------- Finance -------- */
    vehiclePrice: { type: Number, required: true },
    downPaymentAmount: { type: Number, required: true },
    downPaymentPercentage: { type: Number, required: true },
    loanAmount: { type: Number, required: true },
    interestRate: { type: Number, required: true },
    tenure: { type: Number, required: true },
    estimatedEMI: { type: Number, required: true },

    /* -------- Status -------- */
    status: {
      type: String,
      enum: ["C0", "C1", "C2", "C3"],
      default: "C0",
      set: mapLegacyStatus,
    },

    /* -------- Assignment (admin/DSE ops) -------- */
    assignedTo: { type: String, default: null }, // display name (compat)
    assignedToId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedToEmail: String,

    /* DSE activity trail */
    dseUpdates: [DseUpdateSchema],

    /* -------- User (account making the lead) -------- */
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    userPhone: { type: String, required: false },

    /* -------- Applicant details (optional, from modal) -------- */
    financeCustomerName: String,
    addressLine: String,
    state: String,
    district: String,
    pin: String, // keep as string to preserve leading zeros
    whatsapp: String,
    applicantEmail: String, // FE sends "email" – controller maps it here
    applicantType: {
      type: String,
      enum: ["individual", "company"],
      default: "individual",
    },
    companyGST: String,
    companyPAN: String,
    sourceOfEnquiry: String,
    dseId: { type: String }, // keeps raw id string from FE (can be ObjectId string)
    dseName: String,

    /* -------- KYC fields -------- */
    aadharFile: { type: fileSchema, default: null },
    panCardFile: { type: fileSchema, default: null },
    aadharNumber: { type: Number, default: null },
    panNumber: { type: String, default: null },
    kycPhone: String,
    kycProvided: { type: Boolean, default: false },
    kycFields: { type: mongoose.Schema.Types.Mixed, default: {} },
    kycConsent: { type: Boolean, default: false },

    /* -------- CIBIL / credit meta (optional) -------- */
    cibilScore: { type: Number, default: null },
    cibilStatus: { type: String, default: null },
    fullNameForCibil: String,
    creditChargeINR: { type: Number, default: 0 },
    creditProvider: String,
  },
  { timestamps: true }
);

const Lead = mongoose.model("Lead", leadSchema);
export default Lead;
