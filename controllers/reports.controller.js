// controllers/reports.controller.js
import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import Enquiry from "../models/Enquiry.js";
import Quotation from "../models/Quotation.js";
import InternalCosting from "../models/InternalCosting.js";
import TrackingPing from "../models/TrackingPing.js"; // new (see section 3)

// ---- Helpers ----
const toObjectId = (v) => {
  try {
    return new mongoose.Types.ObjectId(v);
  } catch {
    return null;
  }
};

const granularityToDateTrunc = (granularity = "day") => {
  // supported: day | week | month | year
  const units = new Set(["day", "week", "month", "year"]);
  return units.has(granularity) ? granularity : "day";
};

const buildDateMatch = (from, to) => {
  const match = {};
  if (from || to) {
    match.$expr = {
      $and: [
        from ? { $gte: ["$createdAt", new Date(from)] } : { $gte: [1, 1] },
        to ? { $lte: ["$createdAt", new Date(to)] } : { $gte: [1, 1] },
      ],
    };
  }
  return match;
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

// Common lookup to User to derive branch/assignee name (if you store it there)
const lookupAssignee = () => [
  {
    $lookup: {
      from: "users",
      localField: "assignedToId",
      foreignField: "_id",
      as: "assignee",
      pipeline: [{ $project: { name: 1, email: 1, branch: 1 } }],
    },
  },
  { $unwind: { path: "$assignee", preserveNullAndEmptyArrays: true } },
];

// ===================== 1) Enquiry Report =====================
// GET /api/reports/enquiries?granularity=day&from=...&to=...&branchId=&dseId=&status=all|C0|C1...
// optional: source=xyz (if you add "source" in Enquiry)
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
    } = req.query;

    const match = {};
    if (status && status !== "all") match.status = status;
    if (source) match.source = source; // tolerate missing field
    if (dseId) match.assignedToId = toObjectId(dseId);

    const dateMatch = buildDateMatch(from, to);

    const pipeline = [
      ...(from || to ? [dateMatch] : []),
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      ...lookupAssignee(),
      ...withDateBucket(granularity),
      // optional branch filter if provided and your User has .branch
      ...(branchId ? [{ $match: { "assignee.branch": branchId } }] : []),
      {
        $group: {
          _id: {
            timeBucket: "$timeBucket",
            branch: "$assignee.branch",
            dseId: "$assignedToId",
            status: "$status",
            source: "$source", // may be undefined if field absent
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

    const data = await Enquiry.aggregate(pipeline);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

// ===================== 2) Lead Conversion Report (C0→C3) =====================
// GET /api/reports/conversions?granularity=week&from=&to=&branchId=&dseId=
export const getLeadConversionReport = async (req, res, next) => {
  try {
    const { granularity = "week", from, to, branchId, dseId } = req.query;

    const match = {};
    if (dseId) match.assignedToId = toObjectId(dseId);

    const dateMatch = buildDateMatch(from, to);

    const pipeline = [
      ...(from || to ? [dateMatch] : []),
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      ...lookupAssignee(),
      ...withDateBucket(granularity),
      ...(branchId ? [{ $match: { "assignee.branch": branchId } }] : []),
      {
        $group: {
          _id: {
            timeBucket: "$timeBucket",
            branch: "$assignee.branch",
            dseId: "$assignedToId",
            status: "$status", // C0/C1/C2/C3
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
          byStage: {
            $push: { k: "$_id.status", v: "$count" },
          },
          total: { $sum: "$count" },
        },
      },
      {
        $project: {
          _id: 0,
          timeBucket: "$_id.timeBucket",
          branch: "$_id.branch",
          dseId: "$_id.dseId",
          byStage: { $arrayToObject: "$byStage" }, // {C0: n, C1: n, ...}
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
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

// ===================== 3) Sales (C3) Report =====================
// GET /api/reports/sales-c3?granularity=month&from=&to=&branchId=&dseId=&segment=&model=
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
    } = req.query;

    const match = { status: "C3" }; // sold
    if (dseId) match.assignedToId = toObjectId(dseId);
    if (segment) match.productCategory = segment;
    if (model) match.productTitle = model;

    const dateMatch = buildDateMatch(from, to);

    const pipeline = [
      ...(from || to ? [dateMatch] : []),
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      ...lookupAssignee(),
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
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

// ===================== 4) Internal Costing Report =====================
// GET /api/reports/internal-costing?granularity=month&from=&to=&branchId=
export const getInternalCostingReport = async (req, res, next) => {
  try {
    const { granularity = "month", from, to, branchId } = req.query;

    const dateMatch = {};
    if (from || to) {
      dateMatch.$match = {
        ...(from ? { createdAt: { $gte: new Date(from) } } : {}),
        ...(to
          ? {
              ...(dateMatch.$match || {}),
              createdAt: {
                ...(dateMatch.$match?.createdAt || {}),
                $lte: new Date(to),
              },
            }
          : {}),
      };
    }

    const pipeline = [
      ...(from || to ? [dateMatch] : []),
      // link to lead -> user (branch)
      {
        $lookup: {
          from: "leads",
          localField: "leadId",
          foreignField: "_id",
          as: "lead",
          pipeline: [
            { $project: { assignedToId: 1, createdAt: 1 } },
            ...lookupAssignee(),
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
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

// ===================== 5) DSE Movement (Tracking) =====================
// POST /api/reports/dse/ping  body: { userId, lat, lng, speed?, accuracy?, deviceId? }
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

    // Polyline array: [[lng,lat], ...]
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

    // Also a LineString for the route
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

// GET /api/reports/dse/movement/summary?userId=&granularity=day&from=&to=
export const getDseMovementSummary = async (req, res, next) => {
  try {
    const { userId, granularity = "day", from, to } = req.query;
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
          // naive distance approximation between sequential points (in km) on server side
          // Note: for high accuracy, compute on client or use $function with Haversine across sorted docs.
          // Here we just return ping count; distance can be computed on FE when plotting.
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
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
