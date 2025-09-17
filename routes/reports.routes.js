// routes/reports.js
import express from "express";
import mongoose from "mongoose";
import Enquiry from "../models/Enquiry.js";
import Lead from "../models/Lead.js";
import InternalCosting from "../models/InternalCosting.js";

const router = express.Router();
const { ObjectId } = mongoose.Types;

/* ----------------------------- helpers ----------------------------- */
const parseDate = (v, fallback) => {
  const d = v ? new Date(v) : fallback;
  return isNaN(d.getTime()) ? fallback : d;
};

const parseRange = (req) => {
  const now = new Date();
  const to = parseDate(req.query.to, now);
  // default 30d window
  const from = parseDate(
    req.query.from,
    new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  );

  // sanitize
  if (from > to) [from, to] = [to, from];

  const granularity = ["day", "week", "month", "year"].includes(
    (req.query.granularity || "day").toLowerCase()
  )
    ? req.query.granularity.toLowerCase()
    : "day";

  return { from, to, granularity };
};

const timeBucketExpr = (granularity) => ({
  $dateTrunc: { date: "$createdAt", unit: granularity },
});

const timeBucketString =
  (tz = "UTC") =>
  (expr) => ({
    $dateToString: {
      date: expr,
      format: "%Y-%m-%dT%H:%M:%S.%LZ",
      timezone: tz,
    },
  });

/* ----------------------------- ENQUIRIES ---------------------------- */
/**
 * GET /api/reports/enquiries
 * qs: granularity, from, to, branchId?, dseId?, status=all, source?
 * returns: [{ timeBucket, source?, status?, count }]
 */
router.get("/enquiries", async (req, res, next) => {
  try {
    const { from, to, granularity } = parseRange(req);
    const { dseId, status = "all", source } = req.query;

    /** Match **/
    const match = {
      createdAt: { $gte: from, $lte: to },
    };
    if (dseId && ObjectId.isValid(dseId))
      match.assignedToId = new ObjectId(dseId);
    if (status && status !== "all") match.status = status;
    if (source) match.source = source; // if your Enquiry has `source`

    /** Group by bucket + source (so pie can work) **/
    const bucket = timeBucketExpr(granularity);
    const toIso = timeBucketString();
    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: {
            t: bucket,
            s: { $ifNull: ["$source", "unknown"] },
            st: { $ifNull: ["$status", "C0"] },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          timeBucket: toIso("$_id.t"),
          source: "$_id.s",
          status: "$_id.st",
          count: 1,
        },
      },
      { $sort: { timeBucket: 1 } },
    ];

    const rows = await Enquiry.aggregate(pipeline);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

/* --------------------------- CONVERSIONS --------------------------- */
/**
 * GET /api/reports/conversions
 * qs: granularity, from, to, branchId?, dseId?
 * returns: [{ timeBucket, byStage:{C0..C3}, total, conversionC0toC3 }]
 */
router.get("/conversions", async (req, res, next) => {
  try {
    const { from, to, granularity } = parseRange(req);
    const { dseId } = req.query;

    const match = {
      createdAt: { $gte: from, $lte: to },
    };
    if (dseId && ObjectId.isValid(dseId))
      match.assignedToId = new ObjectId(dseId);

    const bucket = timeBucketExpr(granularity);
    const toIso = timeBucketString();

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: { t: bucket },
          C0: { $sum: { $cond: [{ $eq: ["$status", "C0"] }, 1, 0] } },
          C1: { $sum: { $cond: [{ $eq: ["$status", "C1"] }, 1, 0] } },
          C2: { $sum: { $cond: [{ $eq: ["$status", "C2"] }, 1, 0] } },
          C3: { $sum: { $cond: [{ $eq: ["$status", "C3"] }, 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          timeBucket: toIso("$_id.t"),
          byStage: {
            C0: "$C0",
            C1: "$C1",
            C2: "$C2",
            C3: "$C3",
          },
          total: { $add: ["$C0", "$C1", "$C2", "$C3"] },
          // C0 -> C3 conversion %; safe divide
          conversionC0toC3: {
            $multiply: [
              {
                $cond: [{ $gt: ["$C0", 0] }, { $divide: ["$C3", "$C0"] }, 0],
              },
              100,
            ],
          },
        },
      },
      { $sort: { timeBucket: 1 } },
    ];

    const rows = await Lead.aggregate(pipeline);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------ SALES C3 --------------------------- */
/**
 * GET /api/reports/sales-c3
 * qs: granularity, from, to, branchId?, dseId?, segment?, model?
 * returns: [{ timeBucket, segment, model, units }]
 */
router.get("/sales-c3", async (req, res, next) => {
  try {
    const { from, to, granularity } = parseRange(req);
    const { dseId, segment, model } = req.query;

    const match = {
      createdAt: { $gte: from, $lte: to },
      status: "C3",
    };
    if (dseId && ObjectId.isValid(dseId))
      match.assignedToId = new ObjectId(dseId);
    if (segment) match.productCategory = segment;
    if (model) match.productTitle = model;

    const bucket = timeBucketExpr(granularity);
    const toIso = timeBucketString();

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: {
            t: bucket,
            seg: { $ifNull: ["$productCategory", null] },
            mdl: { $ifNull: ["$productTitle", null] },
          },
          units: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          timeBucket: toIso("$_id.t"),
          segment: "$_id.seg",
          model: "$_id.mdl",
          units: 1,
        },
      },
      { $sort: { timeBucket: 1 } },
    ];

    const rows = await Lead.aggregate(pipeline);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

/* -------------------------- INTERNAL COSTING ----------------------- */
/**
 * GET /api/reports/internal-costing
 * qs: granularity, from, to, branchId?
 * returns: [{ timeBucket, vehicles, totalExShowroom, totalAdders, totalEarnings, totalNetDealerCost, totalQuoted, totalProfit, avgProfit }]
 */
router.get("/internal-costing", async (req, res, next) => {
  try {
    const { from, to, granularity } = parseRange(req);

    const match = { createdAt: { $gte: from, $lte: to } };

    const bucket = timeBucketExpr(granularity);
    const toIso = timeBucketString();

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: { t: bucket },
          vehicles: { $sum: 1 },
          totalExShowroom: { $sum: "$exShowroomOemTp" },
          totalAdders: { $sum: "$totalCostAdders" },
          totalEarnings: { $sum: "$totalEarningsSupports" },
          totalNetDealerCost: { $sum: "$netDealerCost" },
          totalQuoted: { $sum: "$customerQuotedPrice" },
          totalProfit: { $sum: "$dealerProfitPerVehicle" },
          avgProfit: { $avg: "$dealerProfitPerVehicle" },
        },
      },
      {
        $project: {
          _id: 0,
          timeBucket: toIso("$_id.t"),
          vehicles: 1,
          totalExShowroom: 1,
          totalAdders: 1,
          totalEarnings: 1,
          totalNetDealerCost: 1,
          totalQuoted: 1,
          totalProfit: 1,
          avgProfit: { $ifNull: ["$avgProfit", 0] },
        },
      },
      { $sort: { timeBucket: 1 } },
    ];

    const rows = await InternalCosting.aggregate(pipeline);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
