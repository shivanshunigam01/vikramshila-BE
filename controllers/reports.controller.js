// controllers/reports.controller.js
import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import Enquiry from "../models/Enquiry.js";
import InternalCosting from "../models/InternalCosting.js";

/* ----------------- Helpers ----------------- */
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

const buildDateMatch = (from, to) => {
  const createdAt = {};
  if (from) createdAt.$gte = new Date(from);
  if (to) createdAt.$lte = new Date(to);
  return Object.keys(createdAt).length ? { $match: { createdAt } } : null;
};

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

/* ----------------- Filters ----------------- */
export const getFilters = async (_req, res, next) => {
  try {
    const branches = await mongoose.connection
      .collection("users")
      .distinct("branch", { branch: { $exists: true, $ne: null } });

    const dses = await mongoose.connection
      .collection("users")
      .find({}, { projection: { name: 1 } })
      .limit(1000)
      .toArray();
    const dseOptions = dses.map((u) => ({ id: u._id, name: u.name || "" }));

    const segments = await Lead.distinct("productCategory", {
      productCategory: { $exists: true, $ne: null },
    });
    const models = await Lead.distinct("productTitle", {
      productTitle: { $exists: true, $ne: null },
    });

    res.json({
      success: true,
      data: { branches, dses: dseOptions, segments, models },
    });
  } catch (e) {
    next(e);
  }
};

/* ----------------- Enquiries ----------------- */
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
    if (dseId) {
      const oid = toObjectId(dseId);
      match.$or = [{ assignedToId: oid }, { dseId: oid }];
    }

    const stages = [
      ...(buildDateMatch(from, to) ? [buildDateMatch(from, to)] : []),
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      { $addFields: { _assigneeId: { $ifNull: ["$assignedToId", "$dseId"] } } },
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
          count: 1,
        },
      },
      { $sort: { timeBucket: 1 } },
    ];

    const data = await Enquiry.aggregate(stages);
    if (String(format).toLowerCase() === "csv")
      return sendCSV(res, data, "enquiries.csv");
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

/* ----------------- Conversions ----------------- */
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
        },
      },
      { $sort: { timeBucket: 1 } },
    ];

    const data = await Lead.aggregate(pipeline);
    if (String(format).toLowerCase() === "csv")
      return sendCSV(res, data, "conversions.csv");
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

/* ----------------- Sales (C3) ----------------- */
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
      { $match: match },
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
      { $sort: { timeBucket: 1 } },
    ];

    const data = await Lead.aggregate(pipeline);
    if (String(format).toLowerCase() === "csv")
      return sendCSV(res, data, "sales_c3.csv");
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

/* ----------------- Internal Costing ----------------- */
export const getInternalCostingReport = async (req, res, next) => {
  try {
    const { granularity = "month", from, to, branchId, format } = req.query;

    const pipeline = [
      ...(buildDateMatch(from, to) ? [buildDateMatch(from, to)] : []),
      {
        $lookup: {
          from: "leads",
          localField: "leadId",
          foreignField: "_id",
          as: "lead",
          pipeline: [
            { $project: { assignedToId: 1 } },
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
          _id: { timeBucket: "$timeBucket", branch: "$assignee.branch" },
          vehicles: { $sum: 1 },
          totalExShowroom: { $sum: "$exShowroomOemTp" },
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
          totalProfit: 1,
          avgProfit: { $round: ["$avgProfit", 2] },
        },
      },
      { $sort: { timeBucket: 1 } },
    ];

    const data = await InternalCosting.aggregate(pipeline);
    if (String(format).toLowerCase() === "csv")
      return sendCSV(res, data, "internal_costing.csv");
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

/* ----------------- Assignment APIs ----------------- */
export const assignLead = async (req, res, next) => {
  try {
    const { leadId, dseId, dseName } = req.body;
    if (!leadId || !dseId)
      return res
        .status(400)
        .json({ success: false, message: "leadId and dseId required" });

    const lead = await Lead.findByIdAndUpdate(
      leadId,
      {
        assignedToId: toObjectId(dseId),
        ...(dseName ? { assignedTo: dseName } : {}),
      },
      { new: true }
    );
    if (!lead)
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });
    res.json({ success: true, data: lead });
  } catch (e) {
    next(e);
  }
};

export const assignEnquiry = async (req, res, next) => {
  try {
    const { enquiryId, dseId, dseName } = req.body;
    if (!enquiryId || !dseId)
      return res
        .status(400)
        .json({ success: false, message: "enquiryId and dseId required" });

    const enquiry = await Enquiry.findByIdAndUpdate(
      enquiryId,
      { dseId: toObjectId(dseId), ...(dseName ? { dseName } : {}) },
      { new: true }
    );
    if (!enquiry)
      return res
        .status(404)
        .json({ success: false, message: "Enquiry not found" });
    res.json({ success: true, data: enquiry });
  } catch (e) {
    next(e);
  }
};
