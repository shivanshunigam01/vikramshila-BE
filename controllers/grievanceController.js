const Grievance = require("../models/Grievance");
const RESP = require("../utils/response");
const sendMail = require("../utils/sendMail");

/* ---------------- CREATE ---------------- */
exports.create = async (req, res) => {
  try {
    const grievanceData = {
      fullName: req.body.fullName,
      email: req.body.email || "N/A",
      mobileNumber: req.body.mobileNumber,
      type: req.body.grievanceType || "enquiry",
      subject: req.body.briefDescription || "N/A",
      message: req.body.description || "N/A",
      whatsappConsent: req.body.whatsappConsent || false,
      consentCall: req.body.consentCall || false,
      state: req.body.state || "",
      pincode: req.body.pincode || "",
      status: "pending",
      grievanceUpdates: [
        { status: "pending", message: "Grievance submitted", at: new Date() },
      ],
    };

    const grievance = await Grievance.create(grievanceData);

    // Send admin email
    try {
      await sendMail({
        to: process.env.ADMIN_EMAIL,
        subject: `New ${grievance.type} from ${grievance.fullName}`,
        html: `
          <h2>New Grievance Received</h2>
          <p><b>Name:</b> ${grievance.fullName}</p>
          <p><b>Email:</b> ${grievance.email}</p>
          <p><b>Mobile:</b> ${grievance.mobileNumber}</p>
          <p><b>Type:</b> ${grievance.type}</p>
          <p><b>Subject:</b> ${grievance.subject}</p>
          <p><b>Message:</b> ${grievance.message}</p>
        `,
      });
    } catch (e) {
      console.error("Failed to send grievance email:", e.message);
    }

    return RESP.created(res, grievance, "Grievance submitted successfully");
  } catch (e) {
    return RESP.bad(res, e.message, 400);
  }
};

/* ---------------- LIST ---------------- */
exports.list = async (_req, res) => {
  const items = await Grievance.find({}).sort({ createdAt: -1 });
  return RESP.ok(res, items);
};

/* ---------------- UPDATE STATUS ---------------- */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, message } = req.body;

    const item = await Grievance.findById(id);
    if (!item) return RESP.bad(res, "Not found", 404);

    item.status = status || item.status;
    item.grievanceUpdates.push({
      status: status || item.status,
      message: message || "",
      byUser: req.user?._id,
      byName: req.user?.name,
    });
    await item.save();

    // Send user email if resolved/in-progress
    if (item.email && item.email !== "N/A" && status) {
      try {
        await sendMail({
          to: item.email,
          subject:
            status === "resolved"
              ? `Your grievance has been resolved`
              : `Your grievance is under execution`,
          html: `
            <p>Dear ${item.fullName},</p>
            <p>Your grievance titled <b>${
              item.subject
            }</b> is now marked as <b>${status}</b>.</p>
            <p>${message || ""}</p>
          `,
        });
      } catch (e) {
        console.error("Failed to send status update email:", e.message);
      }
    }

    return RESP.ok(res, item, "Status updated");
  } catch (e) {
    return RESP.bad(res, e.message, 500);
  }
};

/* ---------------- DELETE ---------------- */
exports.remove = async (req, res) => {
  const item = await Grievance.findByIdAndDelete(req.params.id);
  if (!item) return RESP.bad(res, "Not found", 404);
  return RESP.ok(res, {}, "Deleted");
};
