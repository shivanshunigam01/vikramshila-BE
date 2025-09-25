// controllers/reports.controller.js
import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import Enquiry from "../models/Enquiry.js";
import Quotation from "../models/Quotation.js";
import InternalCosting from "../models/InternalCosting.js";
import TrackingPing from "../models/TrackingPing.js";

// ---- Helpers ----
const toObjectId = (v) => {
  if (!v) return null;
  try {
    return new mongoose.Types.ObjectId(v);
  } catch {
    return null;
  }
};

const granularityToDateTrunc = (granularity = "day") => {
  const units = new Set(["day", "week", "month", "year"]);
  return units.has(granularity) ? granularity : "day";
};

// Proper $match for createdAt range
const buildDateMatch = (from, to) => {
  const createdAt = {};
  if (from) createdAt.$gte = new Date(from);
  if (to) createdAt.$lte = new Date(to);
  return Object.keys(createdAt).length ? { $match: { createdAt } } : null;
};

// $dateTrunc stage builder
const withDateBucket = (granularity = "day") => [
  {
    $addFields: {
      timeBucket: {
        $dateTrunc: {
          date: "$createdAt",
          unit: granularityToDateTrunc(granularity),
          timezone: "Asia/Kolkata",
        },
      },
    },
  },
];

// Lookup to User with dynamic localField (handles Leads vs Enquiries)
const lookupAssignee = (localField) => [
  {
    $lookup: {
      from: "users",
      localField,
      foreignField: "_id",
      as: "assignee",
      pipeline: [{ $project: { name: 1, email: 1, branch: 1 } }],
    },
  },
  { $unwind: { path: "$assignee", preserveNullAndEmptyArrays: true } },
];

// CSV response helper
const sendCSV = (res, rows, filename = "report.csv") => {
  const arr = Array.isArray(rows) ? rows : [];
  if (arr.length === 0) {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send("message,No data");
  }
  const headers = Array.from(new Set(arr.flatMap((r) => Object.keys(r))));
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "string" ? v : JSON.stringify(v);
    const needs = s.includes(",") || s.includes("\n") || s.includes('"');
    return needs ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(","),
    ...arr.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ];
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(lines.join("\n"));
};

// ===================== FILTERS (for dropdowns) =====================
// GET /api/reports/filters
export const getFilters = async (req, res, next) => {
  try {
    // Branches from users with a branch value
    const branches = await mongoose.connection
      .collection("users")
      .distinct("branch", { branch: { $exists: true, $ne: null } });

    // DSE users (optional: filter by role if you tag users)
    const dses = await mongoose.connection
      .collection("users")
      .find({}, { projection: { name: 1 } })
      .limit(1000)
      .toArray();
    const dseOptions = dses.map((u) => ({ id: u._id, name: u.name || "" }));

    // Segments/models from Leads (C3 or all)
    const segments = await Lead.distinct("productCategory", {
      productCategory: { $exists: true, $ne: null },
    });
    const models = await Lead.distinct("productTitle", {
      productTitle: { $exists: true, $ne: null },
    });

    res.json({
      success: true,
      data: {
        branches,
        dses: dseOptions,
        segments,
        models,
      },
    });
  } catch (e) {
    next(e);
  }
};

// ===================== 1) Enquiry Report =====================
// GET /api/reports/enquiries?granularity=day&from=&to=&branchId=&dseId=&status=&source=&format=csv
export const getEnquiryReport = async (req, res, next) => {
  try {
    const {
      granularity = "day",
      from,
      to,
      branchId,
      dseId,
      status,
      source,
      format,
    } = req.query;

    const match = {};
    if (status && status !== "all") match.status = status;
    if (source) match.source = source;

    // Accept either assignedToId or dseId stored on Enquiry
    if (dseId) {
      const oid = toObjectId(dseId);
      match.$or = [{ assignedToId: oid }, { dseId: oid }];
    }

    const stages = [
      ...(buildDateMatch(from, to) ? [buildDateMatch(from, to)] : []),
      ...(Object.keys(match).length ? [{ $match: match }] : []),

      // Prefer assignedToId; fallback to dseId
      {
        $addFields: {
          _assigneeId: {
            $ifNull: ["$assignedToId", "$dseId"],
          },
        },
      },
      ...lookupAssignee("_assigneeId"),
      ...withDateBucket(granularity),
      ...(branchId ? [{ $match: { "assignee.branch": branchId } }] : []),

      {
        $group: {
          _id: {
            timeBucket: "$timeBucket",
            branch: "$assignee.branch",
            dseId: "$_assigneeId",
            status: "$status",
            source: "$source",
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          timeBucket: "$_id.timeBucket",
          branch: "$_id.branch",
          dseId: "$_id.dseId",
          status: "$_id.status",
          source: "$_id.source",
          count: 1,
        },
      },
      { $sort: { timeBucket: 1 } },
    ];

    const data = await Enquiry.aggregate(stages);

    if (String(format).toLowerCase() === "csv") {
      return sendCSV(res, data, "enquiries.csv");
    }
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

// ===================== 2) Lead Conversion Report (C0→C3) =====================
// GET /api/reports/conversions?granularity=week&from=&to=&branchId=&dseId=&format=csv
export const getLeadConversionReport = async (req, res, next) => {
  try {
    const {
      granularity = "week",
      from,
      to,
      branchId,
      dseId,
      format,
    } = req.query;

    const match = {};
    if (dseId) match.assignedToId = toObjectId(dseId);

    const pipeline = [
      ...(buildDateMatch(from, to) ? [buildDateMatch(from, to)] : []),
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      ...lookupAssignee("assignedToId"),
      ...withDateBucket(granularity),
      ...(branchId ? [{ $match: { "assignee.branch": branchId } }] : []),
      {
        $group: {
          _id: {
            timeBucket: "$timeBucket",
            branch: "$assignee.branch",
            dseId: "$assignedToId",
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: {
            timeBucket: "$_id.timeBucket",
            branch: "$_id.branch",
            dseId: "$_id.dseId",
          },
          byStage: { $push: { k: "$_id.status", v: "$count" } },
          total: { $sum: "$count" },
        },
      },
      {
        $project: {
          _id: 0,
          timeBucket: "$_id.timeBucket",
          branch: "$_id.branch",
          dseId: "$_id.dseId",
          byStage: { $arrayToObject: "$byStage" },
          total: 1,
          conversionC0toC3: {
            $let: {
              vars: {
                c0: { $ifNull: ["$byStage.C0", 0] },
                c3: { $ifNull: ["$byStage.C3", 0] },
              },
              in: {
                $cond: [
                  { $gt: ["$$c0", 0] },
                  {
                    $round: [
                      { $multiply: [{ $divide: ["$$c3", "$$c0"] }, 100] },
                      2,
                    ],
                  },
                  0,
                ],
              },
            },
          },
        },
      },
      { $sort: { timeBucket: 1 } },
    ];

    const data = await Lead.aggregate(pipeline);

    if (String(format).toLowerCase() === "csv") {
      return sendCSV(res, data, "conversions.csv");
    }
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

// ===================== 3) Sales (C3) Report =====================
// GET /api/reports/sales-c3?granularity=month&from=&to=&branchId=&dseId=&segment=&model=&format=csv
export const getSalesC3Report = async (req, res, next) => {
  try {
    const {
      granularity = "month",
      from,
      to,
      branchId,
      dseId,
      segment,
      model,
      format,
    } = req.query;

    const match = { status: "C3" };
    if (dseId) match.assignedToId = toObjectId(dseId);
    if (segment) match.productCategory = segment;
    if (model) match.productTitle = model;

    const pipeline = [
      ...(buildDateMatch(from, to) ? [buildDateMatch(from, to)] : []),
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      ...lookupAssignee("assignedToId"),
      ...withDateBucket(granularity),
      ...(branchId ? [{ $match: { "assignee.branch": branchId } }] : []),
      {
        $group: {
          _id: {
            timeBucket: "$timeBucket",
            branch: "$assignee.branch",
            dseId: "$assignedToId",
            segment: "$productCategory",
            model: "$productTitle",
          },
          units: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          timeBucket: "$_id.timeBucket",
          branch: "$_id.branch",
          dseId: "$_id.dseId",
          segment: "$_id.segment",
          model: "$_id.model",
          units: 1,
        },
      },
      { $sort: { timeBucket: 1, branch: 1, segment: 1, model: 1 } },
    ];

    const data = await Lead.aggregate(pipeline);

    if (String(format).toLowerCase() === "csv") {
      return sendCSV(res, data, "sales_c3.csv");
    }
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

// ===================== 4) Internal Costing Report =====================
// GET /api/reports/internal-costing?granularity=month&from=&to=&branchId=&format=csv
export const getInternalCostingReport = async (req, res, next) => {
  try {
    const { granularity = "month", from, to, branchId, format } = req.query;

    const pipeline = [
      ...(buildDateMatch(from, to) ? [buildDateMatch(from, to)] : []),

      // link to lead -> user (branch)
      {
        $lookup: {
          from: "leads",
          localField: "leadId",
          foreignField: "_id",
          as: "lead",
          pipeline: [
            { $project: { assignedToId: 1, createdAt: 1 } },
            ...lookupAssignee("assignedToId"),
          ],
        },
      },
      { $unwind: { path: "$lead", preserveNullAndEmptyArrays: true } },
      { $set: { assignee: "$lead.assignee" } },
      ...(branchId ? [{ $match: { "assignee.branch": branchId } }] : []),
      ...withDateBucket(granularity),

      {
        $group: {
          _id: {
            timeBucket: "$timeBucket",
            branch: "$assignee.branch",
          },
          vehicles: { $sum: 1 },
          totalExShowroom: { $sum: "$exShowroomOemTp" },
          totalAdders: { $sum: "$addersSubtotal" },
          totalEarnings: { $sum: "$earningsSubtotal" },
          totalNetDealerCost: { $sum: "$netDealerCost" },
          totalQuoted: { $sum: "$customerQuotedPrice" },
          totalProfit: { $sum: "$dealerProfitPerVehicle" },
          avgProfit: { $avg: "$dealerProfitPerVehicle" },
        },
      },
      {
        $project: {
          _id: 0,
          timeBucket: "$_id.timeBucket",
          branch: "$_id.branch",
          vehicles: 1,
          totalExShowroom: 1,
          totalAdders: 1,
          totalEarnings: 1,
          totalNetDealerCost: 1,
          totalQuoted: 1,
          totalProfit: 1,
          avgProfit: { $round: ["$avgProfit", 2] },
        },
      },
      { $sort: { timeBucket: 1 } },
    ];

    const data = await InternalCosting.aggregate(pipeline);

    if (String(format).toLowerCase() === "csv") {
      return sendCSV(res, data, "internal_costing.csv");
    }
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

// ===================== 5) DSE Movement (Tracking) =====================
// POST /api/reports/dse/ping
export const postTrackingPing = async (req, res, next) => {
  try {
    const { userId, lat, lng, speed, accuracy, deviceId } = req.body;
    if (!userId || typeof lat !== "number" || typeof lng !== "number") {
      return res
        .status(400)
        .json({ success: false, message: "userId, lat, lng required" });
    }
    const doc = await TrackingPing.create({
      userId: toObjectId(userId),
      location: { type: "Point", coordinates: [lng, lat] },
      speed,
      accuracy,
      deviceId,
    });
    res.json({ success: true, data: doc });
  } catch (e) {
    next(e);
  }
};

// GET /api/reports/dse/movement/polyline?userId=&date=YYYY-MM-DD  (or from=&to=)
export const getDseMovementPolyline = async (req, res, next) => {
  try {
    const { userId, date, from, to } = req.query;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "userId required" });

    const q = { userId: toObjectId(userId) };
    if (date) {
      const d0 = new Date(date + "T00:00:00+05:30");
      const d1 = new Date(date + "T23:59:59.999+05:30");
      q.createdAt = { $gte: d0, $lte: d1 };
    } else if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = new Date(from);
      if (to) q.createdAt.$lte = new Date(to);
    }

    const pings = await TrackingPing.find(q, { location: 1, createdAt: 1 })
      .sort({ createdAt: 1 })
      .lean();

    const polyline = pings.map((p) => p.location.coordinates);
    res.json({ success: true, points: polyline, count: pings.length });
  } catch (e) {
    next(e);
  }
};

// GET /api/reports/dse/movement/geojson?userId=&date=YYYY-MM-DD
export const getDseMovementGeoJSON = async (req, res, next) => {
  try {
    const { userId, date, from, to } = req.query;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "userId required" });

    const q = { userId: toObjectId(userId) };
    if (date) {
      const d0 = new Date(date + "T00:00:00+05:30");
      const d1 = new Date(date + "T23:59:59.999+05:30");
      q.createdAt = { $gte: d0, $lte: d1 };
    } else if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = new Date(from);
      if (to) q.createdAt.$lte = new Date(to);
    }

    const pings = await TrackingPing.find(q, { location: 1, createdAt: 1 })
      .sort({ createdAt: 1 })
      .lean();

    const features = pings.map((p) => ({
      type: "Feature",
      geometry: p.location,
      properties: { ts: p.createdAt },
    }));

    const line = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: pings.map((p) => p.location.coordinates),
      },
      properties: { count: pings.length },
    };

    res.json({
      type: "FeatureCollection",
      features: [...features, line],
    });
  } catch (e) {
    next(e);
  }
};

// GET /api/reports/dse/movement/summary?userId=&granularity=day&from=&to=&format=csv
export const getDseMovementSummary = async (req, res, next) => {
  try {
    const { userId, granularity = "day", from, to, format } = req.query;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "userId required" });

    const match = { userId: toObjectId(userId) };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    const pipeline = [
      { $match: match },
      ...withDateBucket(granularity),
      {
        $group: {
          _id: "$timeBucket",
          pings: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          timeBucket: "$_id",
          pings: 1,
        },
      },
      { $sort: { timeBucket: 1 } },
    ];

    const data = await TrackingPing.aggregate(pipeline);

    if (String(format).toLowerCase() === "csv") {
      return sendCSV(res, data, "dse_movement_summary.csv");
    }
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
