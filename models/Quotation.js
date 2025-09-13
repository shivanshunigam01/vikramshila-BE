// models/Quotation.js
import mongoose from "mongoose";

const quotationSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },

    // Customer
    customerName: { type: String, required: true },
    contactNumber: { type: String, required: true },
    address: { type: String, default: "" },
    gstNo: { type: String, default: "" },
    panNo: { type: String, default: "" },
    salesExecutive: { type: String, default: "" },

    // Vehicle
    model: { type: String, required: true },
    variant: { type: String, default: "" },
    color: { type: String, default: "" },

    // Pricing
    exShowroomPrice: { type: Number, default: 0 },
    rtoTax: { type: Number, default: 0 },
    insurance: { type: Number, default: 0 },
    accessories: { type: Number, default: 0 },
    extendedWarranty: { type: Number, default: 0 },
    totalOnRoadPrice: { type: Number, default: 0 },

    // Discounts
    consumerOffer: { type: Number, default: 0 },
    exchangeBonus: { type: Number, default: 0 },
    corporateDiscount: { type: Number, default: 0 },
    additionalDiscount: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },

    // Final
    netSellingPrice: { type: Number, default: 0 },

    // Finance
    loanAmount: { type: Number, default: 0 },
    downPayment: { type: Number, default: 0 },
    processingFee: { type: Number, default: 0 },
    rateOfInterest: { type: Number, default: 0 },
    tenure: { type: Number, default: 0 },
    emi: { type: Number, default: 0 },

    // Misc
    deliveryPeriod: { type: String, default: "" },
    validityPeriod: { type: String, default: "" },
    remarks: { type: String, default: "" },
  },
  { timestamps: true }
);

const Quotation = mongoose.model("Quotation", quotationSchema);
export default Quotation;
