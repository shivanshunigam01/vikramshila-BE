// controllers/plannerController.js
import Planner from "../models/Planner.js";
import { ok, created, bad } from "../utils/response.js";

// helper: safe parse date string
const toDateOrNull = (str) => {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

// ✅ Create plan (DSE)
// ✅ Create plan (DSE) — FINAL FIX
export const createPlannerEntry = async (req, res) => {
  try {
    // Extract DSE identity from JWT
    const dse = req.user;

    if (!dse || !dse.id) {
      return bad(res, "DSE authentication failed. Login again.", 401);
    }

    const {
      visitDate,
      visitTime,
      customerName,
      customerPhone,
      location,
      purpose,
      notes,
      placeType,
    } = req.body;

    const date = toDateOrNull(visitDate);
    if (!date) return bad(res, "visitDate is required or invalid");

    // Auto-fill DSE details — do NOT trust frontend
    const entry = await Planner.create({
      dseId: dse.id,
      dseCode: dse.phone || "",
      dseName: dse.name,
      visitDate: date,
      visitTime: visitTime || "",
      customerName: customerName || "",
      customerPhone: customerPhone || "",
      location: location || "",
      purpose: purpose || "",
      notes: notes || "",
      placeType: placeType || "prospect",
      status: "planned",
    });

    return created(res, entry, "Planner entry created successfully");
  } catch (err) {
    console.error("createPlannerEntry error:", err);
    return bad(res, err.message || "Failed to create planner plan");
  }
};

// ✅ Get plans of a particular DSE
export const getPlannerByDse = async (req, res) => {
  try {
    const { dseId } = req.params;
    const { startDate, endDate, status } = req.query;

    const filter = { $or: [] };

    if (dseId) {
      filter.$or.push(
        { dseId: dseId }, // exact match
        { dseId: String(dseId) }, // string match fix
        { dseCode: dseId }, // match code
        { dseName: { $regex: dseId, $options: "i" } } // name search
      );
    }

    if (!filter.$or.length) delete filter.$or;

    const dateFilter = {};
    const s = toDateOrNull(startDate);
    const e = toDateOrNull(endDate);
    if (s) dateFilter.$gte = s;
    if (e) dateFilter.$lte = e;
    if (Object.keys(dateFilter).length) {
      filter.visitDate = dateFilter;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    const items = await Planner.find(filter).sort({
      visitDate: 1,
      visitTime: 1,
    });

    return ok(res, items);
  } catch (err) {
    console.error("getPlannerByDse error:", err);
    return bad(res, "Failed to fetch planner entries");
  }
};

// ✅ Admin – get all plans with filters & simple summary
export const getPlannerAdmin = async (req, res) => {
  try {
    const { startDate, endDate, dseIdOrName, status } = req.query;

    const filter = {};

    const s = toDateOrNull(startDate);
    const e = toDateOrNull(endDate);
    if (s || e) {
      filter.visitDate = {};
      if (s) filter.visitDate.$gte = s;
      if (e) filter.visitDate.$lte = e;
    }

    if (dseIdOrName && dseIdOrName !== "all") {
      filter.$or = [
        { dseId: dseIdOrName },
        { dseCode: dseIdOrName },
        { dseName: { $regex: dseIdOrName, $options: "i" } },
      ];
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    const plans = await Planner.find(filter).sort({
      visitDate: 1,
      visitTime: 1,
    });

    // simple summary
    const total = plans.length;
    const completed = plans.filter((p) => p.status === "completed").length;
    const planned = plans.filter((p) => p.status === "planned").length;
    const cancelled = plans.filter((p) => p.status === "cancelled").length;
    const completionRate = total ? Math.round((completed / total) * 100) : 0;

    return ok(res, {
      data: plans,
      summary: { total, completed, planned, cancelled, completionRate },
    });
  } catch (err) {
    console.error("getPlannerAdmin error:", err);
    return bad(res, "Failed to fetch planner reports");
  }
};

// ✅ Get single plan by id
export const getPlannerById = async (req, res) => {
  try {
    const item = await Planner.findById(req.params.id);
    if (!item) return bad(res, "Planner entry not found", 404);
    return ok(res, item);
  } catch (err) {
    console.error("getPlannerById error:", err);
    return bad(res, "Failed to fetch planner entry");
  }
};

// ✅ Update full plan (edit)
export const updatePlannerEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Planner.findById(id);
    if (!item) return bad(res, "Planner entry not found", 404);

    const {
      dseId,
      dseCode,
      dseName,
      visitDate,
      visitTime,
      customerName,
      customerPhone,
      location,
      purpose,
      notes,
      placeType,
      status,
      completionNotes,
    } = req.body;

    if (visitDate) {
      const d = toDateOrNull(visitDate);
      if (d) item.visitDate = d;
    }

    if (dseId !== undefined) item.dseId = dseId;
    if (dseCode !== undefined) item.dseCode = dseCode;
    if (dseName !== undefined) item.dseName = dseName;
    if (visitTime !== undefined) item.visitTime = visitTime;
    if (customerName !== undefined) item.customerName = customerName;
    if (customerPhone !== undefined) item.customerPhone = customerPhone;
    if (location !== undefined) item.location = location;
    if (purpose !== undefined) item.purpose = purpose;
    if (notes !== undefined) item.notes = notes;
    if (placeType !== undefined) item.placeType = placeType;

    if (status !== undefined) {
      item.status = status;
      if (status === "completed" && !item.completedAt) {
        item.completedAt = new Date();
      }
      if (status !== "completed") {
        item.completedAt = null;
      }
    }

    if (completionNotes !== undefined) {
      item.completionNotes = completionNotes;
    }

    await item.save();
    return ok(res, item, "Planner entry updated");
  } catch (err) {
    console.error("updatePlannerEntry error:", err);
    return bad(res, "Failed to update planner entry");
  }
};

// ✅ Update only status (DSE / Admin quick action)
export const updatePlannerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, completionNotes } = req.body;

    const item = await Planner.findById(id);
    if (!item) return bad(res, "Planner entry not found", 404);

    if (!["planned", "completed", "cancelled"].includes(status)) {
      return bad(res, "Invalid status");
    }

    item.status = status;
    if (status === "completed") {
      item.completedAt = new Date();
      if (completionNotes) item.completionNotes = completionNotes;
    } else {
      item.completedAt = null;
    }

    await item.save();
    return ok(res, item, "Status updated");
  } catch (err) {
    console.error("updatePlannerStatus error:", err);
    return bad(res, "Failed to update status");
  }
};

// ✅ Delete plan
export const deletePlannerEntry = async (req, res) => {
  try {
    const item = await Planner.findById(req.params.id);
    if (!item) return bad(res, "Planner entry not found", 404);

    await item.deleteOne();
    return ok(res, {}, "Planner entry deleted");
  } catch (err) {
    console.error("deletePlannerEntry error:", err);
    return bad(res, "Failed to delete planner entry");
  }
};

export const addFollowUpNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
      return bad(res, "Follow-up note cannot be empty");
    }

    const item = await Planner.findById(id);
    if (!item) return bad(res, "Planner entry not found", 404);

    const newNote = {
      note,
      timestamp: new Date(),
    };

    // Push into array
    item.followUpNotes.push(newNote);
    await item.save();

    return ok(res, item, "Follow-up note added");
  } catch (err) {
    console.error("addFollowUpNote error:", err);
    return bad(res, "Failed to add follow-up note");
  }
};
