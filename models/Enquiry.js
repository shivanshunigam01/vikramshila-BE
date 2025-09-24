import mongoose from "mongoose";

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

const enquirySchema = new mongoose.Schema(
  {
    // Product
    productId: String,
    productTitle: String,
    productCategory: String,

    // Finance
    vehiclePrice: Number,
    downPaymentAmount: Number,
    downPaymentPercentage: Number,
    loanAmount: Number,
    interestRate: Number,
    tenure: Number,
    estimatedEMI: Number,

    // Status (C0 → C3)
    status: {
      type: String,
      enum: ["C0", "C1", "C2", "C3"],
      default: "C0",
    },

    // Customer
    customerName: String,
    customerPhone: String,
    customerEmail: String,
    address: String,
    city: String,
    state: String,
    pin: String,

    // Assignment
    dseId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    dseName: String,

    // KYC
    aadharNumber: String,
    panNumber: String,
    aadharFile: fileSchema,
    panCardFile: fileSchema,
    kycConsent: Boolean,

    // Credit
    cibilScore: Number,
    cibilStatus: String,

    // Quotation
    quotation: {
      amount: Number,
      date: Date,
      file: fileSchema,
    },

    // Internal Costing
    costing: {
      basePrice: Number,
      discount: Number,
      tax: Number,
      total: Number,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Enquiry", enquirySchema);
