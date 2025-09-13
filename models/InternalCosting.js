import mongoose from "mongoose";

const InternalCostingSchema = new mongoose.Schema(
  {
    // link to lead
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },

    // Vehicle info (optional meta)
    model: String,
    category: String,
    variant: String,
    fuel: String,
    payloadSeating: String,

    // Base price (OEM TP)
    exShowroomOemTp: { type: Number, default: 0 },

    // A) Cost Adders (Dealer Expenses)
    handlingCost: { type: Number, default: 0 },
    exchangeBuybackSubsidy: { type: Number, default: 0 },
    dealerSchemeContribution: { type: Number, default: 0 },
    fabricationCost: { type: Number, default: 0 },
    marketingCost: { type: Number, default: 0 },
    addersSubtotal: { type: Number, default: 0 }, // derived

    // B) Earnings & Supports
    dealerMargin: { type: Number, default: 0 },
    insuranceCommission: { type: Number, default: 0 },
    financeCommission: { type: Number, default: 0 },
    oemSchemeSupport: { type: Number, default: 0 },
    earlyBirdSchemeSupport: { type: Number, default: 0 },
    targetAchievementDiscount: { type: Number, default: 0 },
    rtoEarnings: { type: Number, default: 0 },
    quarterlyTargetEarnings: { type: Number, default: 0 },
    additionalSupportsClaims: { type: Number, default: 0 },
    earningsSubtotal: { type: Number, default: 0 }, // derived

    // C) Totals
    baseVehicleCost: { type: Number, default: 0 }, // = exShowroomOemTp
    totalCostAdders: { type: Number, default: 0 }, // = addersSubtotal
    totalEarningsSupports: { type: Number, default: 0 }, // = earningsSubtotal
    netDealerCost: { type: Number, default: 0 }, // base + adders - earnings

    // Quote & profit
    customerQuotedPrice: { type: Number, default: 0 },
    dealerProfitPerVehicle: { type: Number, default: 0 }, // quoted - netDealerCost
  },
  { timestamps: true }
);

export default mongoose.model("InternalCosting", InternalCostingSchema);
  