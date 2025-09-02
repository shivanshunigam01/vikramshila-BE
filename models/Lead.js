import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productTitle: { type: String, required: true },
    vehiclePrice: { type: Number, required: true },
    downPaymentAmount: { type: Number, required: true },
    downPaymentPercentage: { type: Number, required: true },
    loanAmount: { type: Number, required: true },
    interestRate: { type: Number, required: true },
    tenure: { type: Number, required: true },
    estimatedEMI: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const Lead = mongoose.model("Lead", leadSchema);

export default Lead;
