import Lead from "../models/Lead.js";
import User from "../models/User.js";

// Create a new lead (quote submission)
export const createLead = async (req, res) => {
  try {
    // Body (multipart -> strings): parse numerics safely
    const {
      productId,
      productTitle,
      productCategory,
      vehiclePrice,
      downPaymentAmount,
      downPaymentPercentage,
      loanAmount,
      interestRate,
      tenure,
      estimatedEMI,
      status,
      userId,
      userName,
      userEmail,
      userPhone,
      aadharNumber,
      panNumber,
    } = req.body;

    // Optional files (Cloudinary/Multer will put .path on uploaded files)
    let aadharFile = null;
    if (req.files?.aadharFile?.[0]) {
      const f = req.files.aadharFile[0];
      aadharFile = {
        filename: f.filename,
        originalName: f.originalname,
        path: f.path, // Cloudinary URL if using cloudinary storage
        size: f.size,
        mimetype: f.mimetype,
      };
    }

    let panCardFile = null;
    if (req.files?.panCardFile?.[0]) {
      const f = req.files.panCardFile[0];
      panCardFile = {
        filename: f.filename,
        originalName: f.originalname,
        path: f.path,
        size: f.size,
        mimetype: f.mimetype,
      };
    }

    const newLead = new Lead({
      productId,
      productTitle,
      productCategory: productCategory || "",

      vehiclePrice: Number(vehiclePrice),
      downPaymentAmount: Number(downPaymentAmount),
      downPaymentPercentage: Number(downPaymentPercentage),
      loanAmount: Number(loanAmount),
      interestRate: Number(interestRate),
      tenure: Number(tenure),
      estimatedEMI: Number(estimatedEMI),

      status: status || "C0",

      userId,
      userName,
      userEmail,
      userPhone,

      // NEW
      aadharFile,
      panCardFile,
      aadharNumber,
      panNumber,
    });

    const savedLead = await newLead.save();

    return res.status(201).json({
      success: true,
      message: "Lead created successfully",
      data: savedLead,
    });
  } catch (error) {
    console.error("Error creating lead:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating lead",
      error: error.message,
    });
  }
};

// Get all leads
export const getLeads = async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      totalLeads: leads.length,
      data: leads,
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get a single lead by ID
export const getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });
    }
    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    console.error("Error fetching lead:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const assignLead = async (req, res) => {
  try {
    const { leadId, assigneeId, assignee } = req.body;

    if (!leadId || (!assigneeId && !assignee)) {
      return res.status(400).json({
        success: false,
        message: "leadId and assigneeId/assignee are required",
      });
    }

    // locate DSE
    let dse = null;
    if (assigneeId) {
      dse = await User.findById(assigneeId);
    } else if (assignee) {
      dse = await User.findOne({
        $or: [{ name: assignee }, { email: assignee }],
      });
    }

    if (!dse)
      return res.status(404).json({ success: false, message: "DSE not found" });
    if (dse.role !== "dse")
      return res
        .status(400)
        .json({ success: false, message: "Assignee is not a DSE" });

    const lead = await Lead.findById(leadId);
    if (!lead)
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });

    // Assign (keep old name field for backward compatibility)
    lead.assignedToId = dse._id;
    lead.assignedTo = dse.name || dse.email || "DSE";
    lead.assignedToEmail = dse.email || lead.assignedToEmail;

    // bump status to C1 from C0 (or invalid)
    const allowed = new Set(["C0", "C1", "C2", "C3"]);
    const curr = lead.status;
    if (!allowed.has(curr) || curr === "C0") lead.status = "C1";

    await lead.save();

    return res
      .status(200)
      .json({ success: true, message: "Lead assigned", data: lead });
  } catch (error) {
    console.error("assignLead error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const assignedtoDSE = async (req, res) => {
  try {
    const dses = await User.find({ role: "dse" }).select(
      "_id name email role createdAt updatedAt"
    ); // exclude password
    return res.status(200).json({
      success: true,
      count: dses.length,
      data: dses,
    });
  } catch (error) {
    console.error("assignedtoDSE error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching DSE list",
      error: error.message,
    });
  }
};

/* ---------- NEW: assigned to me ---------- */
export const listAssignedToMe = async (req, res) => {
  try {
    const me = req.user || {};
    const ors = [];

    if (me._id) ors.push({ assignedToId: me._id });
    if (me.email) ors.push({ assignedToEmail: me.email });
    if (me.name) ors.push({ assignedTo: me.name }); // current DB uses name

    if (!ors.length) return res.status(200).json({ success: true, data: [] });

    const items = await Lead.find({ $or: ors }).sort({ updatedAt: -1 });
    return res.status(200).json({ success: true, data: items });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/* ---------- NEW: DSE update (status+note) ---------- */
// body: { status?: "C0"|"C1"|"C2"|"C3", message?: string }
export const dseUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, message } = req.body || {};
    const allowed = new Set(["C0", "C1", "C2", "C3"]);

    const lead = await Lead.findById(id);
    if (!lead)
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });

    if (status && !allowed.has(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    // only assigned DSE or admin/editor can change
    const me = req.user || {};
    const roles = (Array.isArray(me.role) ? me.role : [me.role]).filter(
      Boolean
    );
    const isStaff = roles.includes("admin") || roles.includes("editor");

    const isAssigned =
      (lead.assignedToId && String(lead.assignedToId) === String(me._id)) ||
      (lead.assignedToEmail && lead.assignedToEmail === me.email) ||
      (lead.assignedTo && lead.assignedTo === me.name);

    if (!isAssigned && !isStaff) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const prev = lead.status;
    if (status) lead.status = status;

    lead.dseUpdates = lead.dseUpdates || [];
    lead.dseUpdates.push({
      byUser: me._id,
      byName: me.name,
      message: message || "",
      statusFrom: prev,
      statusTo: status || prev,
    });

    await lead.save();
    return res
      .status(200)
      .json({ success: true, message: "Lead updated", data: lead });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
