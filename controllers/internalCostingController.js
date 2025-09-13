import Lead from "../models/Lead.js";
import InternalCosting from "../models/InternalCosting.js";

const N = (v) => (Number.isFinite(+v) ? +v : 0);

function computeDerived(x) {
  const addersSubtotal =
    N(x.handlingCost) +
    N(x.exchangeBuybackSubsidy) +
    N(x.dealerSchemeContribution) +
    N(x.fabricationCost) +
    N(x.marketingCost);

  const earningsSubtotal =
    N(x.dealerMargin) +
    N(x.insuranceCommission) +
    N(x.financeCommission) +
    N(x.oemSchemeSupport) +
    N(x.earlyBirdSchemeSupport) +
    N(x.targetAchievementDiscount) +
    N(x.rtoEarnings) +
    N(x.quarterlyTargetEarnings) +
    N(x.additionalSupportsClaims);

  const baseVehicleCost = N(x.exShowroomOemTp);
  const totalCostAdders = addersSubtotal;
  const totalEarningsSupports = earningsSubtotal;
  const netDealerCost =
    baseVehicleCost + totalCostAdders - totalEarningsSupports;
  const dealerProfitPerVehicle = N(x.customerQuotedPrice) - netDealerCost;

  return {
    addersSubtotal,
    earningsSubtotal,
    baseVehicleCost,
    totalCostAdders,
    totalEarningsSupports,
    netDealerCost,
    dealerProfitPerVehicle,
  };
}

/* ---------------- CREATE ---------------- */
export const createInternalCosting = async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.leadId) {
      return res
        .status(400)
        .json({ success: false, message: "leadId is required" });
    }

    const lead = await Lead.findById(b.leadId);
    if (!lead)
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });

    // coerce numerics
    [
      "exShowroomOemTp",
      "handlingCost",
      "exchangeBuybackSubsidy",
      "dealerSchemeContribution",
      "fabricationCost",
      "marketingCost",
      "dealerMargin",
      "insuranceCommission",
      "financeCommission",
      "oemSchemeSupport",
      "earlyBirdSchemeSupport",
      "targetAchievementDiscount",
      "rtoEarnings",
      "quarterlyTargetEarnings",
      "additionalSupportsClaims",
      "customerQuotedPrice",
    ].forEach((k) => (b[k] = N(b[k])));

    const derived = computeDerived(b);
    const doc = await InternalCosting.create({ ...b, ...derived });

    // ✅ If lead is at C2, move to C3 (Final) after costing is created
    let leadChanged = lead;
    if (lead.status === "C2") {
      const me = req.user || {};
      lead.dseUpdates = lead.dseUpdates || [];
      lead.dseUpdates.push({
        byUser: me._id,
        byName: me.name || "System",
        message: "Internal costing finalized; moved to C3",
        statusFrom: "C2",
        statusTo: "C3",
      });
      lead.status = "C3";
      await lead.save();
      leadChanged = lead;
    }

    return res
      .status(201)
      .json({ success: true, data: doc, lead: leadChanged });
  } catch (e) {
    console.error("createInternalCosting error:", e);
    return res.status(500).json({ success: false, message: e.message });
  }
};

/* ---------------- UPDATE ---------------- */
export const updateInternalCosting = async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body || {};

    // coerce possible numeric fields
    Object.keys(b).forEach((k) => {
      if (
        [
          "exShowroomOemTp",
          "handlingCost",
          "exchangeBuybackSubsidy",
          "dealerSchemeContribution",
          "fabricationCost",
          "marketingCost",
          "dealerMargin",
          "insuranceCommission",
          "financeCommission",
          "oemSchemeSupport",
          "earlyBirdSchemeSupport",
          "targetAchievementDiscount",
          "rtoEarnings",
          "quarterlyTargetEarnings",
          "additionalSupportsClaims",
          "customerQuotedPrice",
        ].includes(k)
      ) {
        b[k] = N(b[k]);
      }
    });

    // get current to compute with existing values
    const current = await InternalCosting.findById(id);
    if (!current)
      return res.status(404).json({ success: false, message: "Not found" });

    const derived = computeDerived({ ...current.toObject(), ...b });
    const updated = await InternalCosting.findByIdAndUpdate(
      id,
      { $set: { ...b, ...derived } },
      { new: true, runValidators: true }
    );

    // ✅ Also ensure lead moves to C3 if it was C2
    let leadChanged = null;
    if (updated?.leadId) {
      const lead = await Lead.findById(updated.leadId);
      if (lead && lead.status === "C2") {
        const me = req.user || {};
        lead.dseUpdates = lead.dseUpdates || [];
        lead.dseUpdates.push({
          byUser: me._id,
          byName: me.name || "System",
          message: "Internal costing finalized; moved to C3",
          statusFrom: "C2",
          statusTo: "C3",
        });
        lead.status = "C3";
        await lead.save();
        leadChanged = lead;
      }
    }

    return res.json({ success: true, data: updated, lead: leadChanged });
  } catch (e) {
    console.error("updateInternalCosting error:", e);
    return res.status(500).json({ success: false, message: e.message });
  }
};

/* ---------------- GET BY LEAD ---------------- */
export const getInternalCostingByLeadId = async (req, res) => {
  try {
    const { leadId } = req.params;
    const doc = await InternalCosting.findOne({ leadId });
    return res.json({ success: true, data: doc || null });
  } catch (e) {
    console.error("getInternalCostingByLeadId error:", e);
    return res.status(500).json({ success: false, message: e.message });
  }
};
