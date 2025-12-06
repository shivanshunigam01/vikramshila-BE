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
  return legacy[key] || val;
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
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    productTitle: String,
    productCategory: String,

    /* -------- Finance -------- */
    vehiclePrice: Number,
    downPaymentAmount: Number,
    downPaymentPercentage: Number,
    loanAmount: Number,
    interestRate: Number,
    tenure: Number,
    estimatedEMI: Number,

    /* -------- Status -------- */
    status: {
      type: String,
      enum: ["C0", "C1", "C2", "C3"],
      default: "C0",
      set: mapLegacyStatus,
    },

    /* -------- User (optional now) -------- */
    userId: { type: String },
    userName: { type: String },
    userEmail: { type: String },
    userPhone: { type: String },

    /* -------- Assignment -------- */
    assignedTo: { type: String, default: null },
    assignedToId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedToEmail: String,

    dseUpdates: [DseUpdateSchema],

    /* -------- Applicant details (optional) -------- */
    financeCustomerName: String,
    addressLine: String,
    state: String,
    district: String,
    pin: String,
    whatsapp: String,
    applicantEmail: String,
    applicantType: { type: String, enum: ["individual", "company"] },
    companyGST: String,
    companyPAN: String,
    sourceOfEnquiry: String,
    dseId: String,
    dseName: String,

    /* -------- KYC -------- */
    aadharFile: fileSchema,
    panCardFile: fileSchema,
    aadharNumber: Number,
    panNumber: String,
    kycPhone: String,
    kycProvided: Boolean,
    kycFields: mongoose.Schema.Types.Mixed,
    kycConsent: Boolean,

    /* -------- CIBIL -------- */
    cibilScore: Number,
    cibilStatus: String,
    fullNameForCibil: String,
    creditChargeINR: Number,
    creditProvider: String,
  },
  { timestamps: true }
);

const Lead = mongoose.model("Lead", leadSchema);
export default Lead;
