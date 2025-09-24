// controllers/enquiryController.js
import mongoose from "mongoose";
import Enquiry from "../models/Enquiry.js";
import User from "../models/User.js"; // only needed if you populate or validate assignees

const isObjectId = (v) => /^[0-9a-fA-F]{24}$/.test(String(v || ""));
const N = (v, d = 0) => (Number.isFinite(+v) ? +v : d);

/* ------------------------- LIST (admin) ------------------------- */
export const listEnquiries = async (_req, res) => {
  try {
    const items = await Enquiry.find().sort({ createdAt: -1 });
    return res.json({ success: true, data: items });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/* ----------------- LIST assigned to logged-in DSE --------------- */
/* Expects req.user?  If using JWT middleware, ensure it sets req.user = { _id, name, email } */
export const listAssignedToMe = async (req, res) => {
  try {
    const me = req.user?._id || req.user?.id;
    if (!isObjectId(me)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const items = await Enquiry.find({
      $or: [{ assignedToId: me }, { dseId: String(me) }],
    }).sort({ createdAt: -1 });
    return res.json({ success: true, data: items });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/* --------------------------- DETAIL ----------------------------- */
export const getEnquiryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }
    const item = await Enquiry.findById(id);
    if (!item) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, data: item });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/* --------------------------- CREATE ----------------------------- */
export const createEnquiry = async (req, res) => {
  try {
    const b = req.body || {};
    // Minimal create — expand if you accept file uploads etc.
    const doc = await Enquiry.create({
      // product
      productId: b.productId,
      productTitle: b.productTitle,
      productCategory: b.productCategory || "",

      // finance
      vehiclePrice: N(b.vehiclePrice),
      downPaymentAmount: N(b.downPaymentAmount),
      downPaymentPercentage: N(b.downPaymentPercentage),
      loanAmount: N(b.loanAmount),
      interestRate: N(b.interestRate),
      tenure: N(b.tenure),
      estimatedEMI: N(b.estimatedEMI),

      // status
      status: b.status || "C0",

      // customer/user
      customerName: b.customerName || b.fullName || b.userName || "",
      userName: b.userName,
      userEmail: b.userEmail || b.email,
      userPhone: b.userPhone || b.mobileNumber || b.phone,

      // kyc
      aadharNumber: b.aadharNumber,
      panNumber: b.panNumber,

      // assignment (optional at create)
      assignedTo: b.assignedTo,
      assignedToEmail: b.assignedToEmail,
      assignedToId: isObjectId(b.assignedToId) ? b.assignedToId : undefined,
    });

    return res.status(201).json({ success: true, message: "Enquiry created", data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/* ---------------------------- UPDATE ---------------------------- */
export const updateEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }
    const b = req.body || {};
    const doc = await Enquiry.findByIdAndUpdate(id, b, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, message: "Enquiry updated", data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/* ----------------------- ASSIGN to DSE -------------------------- */
/* Body: { enquiryId, assigneeId?, assignee } */
export const assignEnquiry = async (req, res) => {
  try {
    const { enquiryId, assigneeId, assignee } = req.body || {};

    if (!isObjectId(enquiryId)) {
      return res.status(400).json({ success: false, message: "Invalid enquiryId" });
    }
    if (!assigneeId && !assignee) {
      return res
        .status(400)
        .json({ success: false, message: "Provide assigneeId or assignee" });
    }

    const update = { status: "C1" }; // bump to C1 on assignment

    // If ObjectId provided, link to User
    if (assigneeId && isObjectId(assigneeId)) {
      update.assignedToId = new mongoose.Types.ObjectId(assigneeId);

      // Optional: fetch to store readable name/email snapshot
      try {
        const u = await User.findById(assigneeId).select("name email");
        if (u) {
          update.assignedTo = u.name;
          update.assignedToEmail = u.email;
        }
      } catch {
        /* ignore lookup failure */
      }
    }

    // Always keep whatever was passed as a traceable label
    if (assignee) {
      update.assignedTo = update.assignedTo || assignee;
      if (!update.assignedToEmail && assignee.includes("@")) {
        update.assignedToEmail = assignee;
      }
    }

    const doc = await Enquiry.findByIdAndUpdate(enquiryId, update, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });

    return res.json({ success: true, message: "Assigned", data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/* -------------------- DSE Update (status/message) --------------- */
/* PATCH /enquiries/:id/dse-update  Body: { status?: "C0"|"C1"|"C2"|"C3", message?: string } */
export const dseUpdateEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const { status, message } = req.body || {};
    const allowed = new Set(["C0", "C1", "C2", "C3"]);
    const set = {};

    if (status) {
      if (!allowed.has(status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
      }
      set.status = status;
    }

    const pushUpdate =
      message || status
        ? {
            dseUpdates: {
              byUser: req.user?._id || undefined,
              byName: req.user?.name || undefined,
              message: message || "",
              statusFrom: undefined, // could be set if you fetch the doc first
              statusTo: status || undefined,
              at: new Date(),
            },
          }
        : null;

    const doc = await Enquiry.findByIdAndUpdate(
      id,
      {
        ...(Object.keys(set).length ? { $set: set } : {}),
        ...(pushUpdate ? { $push: pushUpdate } : {}),
      },
      { new: true }
    );

    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
