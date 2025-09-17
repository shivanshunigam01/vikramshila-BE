// controllers/enquiryController.js
import Enquiry from "../models/Enquiry.js";
import sendMail from "../utils/sendMail.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { ok, created, bad, error } from "../utils/response.js"; // ✅ import functions directly

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Create a new enquiry
export const create = async (req, res) => {
  try {
    const enquiry = new Enquiry(req.body);
    await enquiry.save();
    return created(res, enquiry, "Enquiry created successfully"); // use created()
  } catch (err) {
    return error(res, err); // use error()
  }
};

// // List all enquiries
// exports.list = async (req, res, next) => {
//   try {
//     const { status, q } = req.query;

//     const filter = {};
//     if (status && ["C0", "C1", "C2", "C3"].includes(status)) {
//       filter.status = status;
//     }

//     if (q && q.trim()) {
//       const s = q.trim();
//       filter.$or = [
//         { fullName: new RegExp(s, "i") },
//         { mobileNumber: new RegExp(s, "i") },
//         { product: new RegExp(s, "i") },
//       ];
//     }

//     const data = await Enquiry.find(filter)
//       .sort({ createdAt: -1 })
//       // ✅ correct path to populate
//       .populate({
//         path: "assignedToId",
//         select: "name email role",
//         // strictPopulate is true by default in Mongoose 7, so use correct path
//       })
//       .lean();

//     res.json({ success: true, message: "OK", data });
//   } catch (err) {
//     next(err);
//   }
// };

// Mark an enquiry as contacted
export const markContacted = async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      { contacted: true },
      { new: true }
    );
    if (!enquiry) return bad(res, "Enquiry not found", 404); // use bad()
    return ok(res, enquiry, "Enquiry marked as contacted");
  } catch (err) {
    return error(res, err);
  }
};

// Remove an enquiry
export const remove = async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndDelete(req.params.id);
    if (!enquiry) return bad(res, "Enquiry not found", 404);
    return ok(res, enquiry, "Enquiry deleted successfully");
  } catch (err) {
    return error(res, err);
  }
};

export const list = async (req, res, next) => {
  try {
    const { status, q } = req.query;

    const filter = {};
    if (status && ["C0", "C1", "C2", "C3"].includes(status)) {
      filter.status = status;
    }

    if (q && q.trim()) {
      const s = q.trim();
      filter.$or = [
        { fullName: new RegExp(s, "i") },
        { mobileNumber: new RegExp(s, "i") },
        { product: new RegExp(s, "i") },
      ];
    }

    const data = await Enquiry.find(filter)
      .sort({ createdAt: -1 })
      // ✅ populate correct path
      .populate({
        path: "assignedToId",
        select: "name email role",
      })
      .lean();

    res.json({ success: true, message: "OK", data });
  } catch (err) {
    next(err);
  }
};

export const assignEnquiry = async (req, res, next) => {
  try {
    const { enquiryId, assigneeId } = req.body;

    // Validate body
    if (!enquiryId || !assigneeId) {
      return res.status(400).json({
        success: false,
        message: "enquiryId and assigneeId are required",
      });
    }
    if (!isObjectId(enquiryId) || !isObjectId(assigneeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiryId or assigneeId",
      });
    }

    // Find assignee (must be a DSE ideally)
    const user = await User.findById(assigneeId).select("name email role");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Assignee not found" });
    }

    // Assign enquiry
    const updated = await Enquiry.findByIdAndUpdate(
      enquiryId,
      {
        assignedToId: user._id,
        assignedTo: user.name || null,
        assignedToEmail: user.email || null,
      },
      { new: true }
    ).lean();

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Enquiry not found" });
    }

    return res.json({
      success: true,
      message: "Enquiry assigned successfully",
      data: updated,
    });
  } catch (err) {
    console.error("assignEnquiry error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const listAssignedToMeEnquiries = async (req, res, next) => {
  try {
    const myId = req.user && req.user._id;
    if (!myId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const data = await Enquiry.find({ assignedToId: myId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const dseUpdateEnquiry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, message } = req.body;

    const update = {};
    if (status && ["C0", "C1", "C2", "C3"].includes(status))
      update.status = status;
    if (message) update.lastMessage = message;

    const doc = await Enquiry.findByIdAndUpdate(id, update, { new: true });
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};
