const Grievance = require("../models/Grievance");
const RESP = require("../utils/response");
const sendMail = require("../utils/sendMail");

const dateFilter = (filter) => {
  const now = new Date();
  let from;
  if (filter === "week") {
    from = new Date(now);
    from.setDate(now.getDate() - 7);
  } else if (filter === "month") {
    from = new Date(now);
    from.setMonth(now.getMonth() - 1);
  } else if (filter === "year") {
    from = new Date(now);
    from.setFullYear(now.getFullYear() - 1);
  }
  return from ? { $gte: from, $lte: now } : undefined;
};

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
          <p><b>WhatsApp Consent:</b> ${
            grievance.whatsappConsent ? "Yes" : "No"
          }</p>
          <p><b>Call Consent:</b> ${grievance.consentCall ? "Yes" : "No"}</p>
          <p><b>State:</b> ${grievance.state}</p>
          <p><b>Pincode:</b> ${grievance.pincode}</p>
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

exports.list = async (req, res) => {
  const { filter } = req.query;
  const q = {};
  if (filter) q.createdAt = dateFilter(filter);

  const items = await Grievance.find(q).sort({ createdAt: -1 });
  return RESP.ok(res, items);
};

exports.markResolved = async (req, res) => {
  const item = await Grievance.findByIdAndUpdate(
    req.params.id,
    { status: "resolved" },
    { new: true }
  );
  if (!item) return RESP.bad(res, "Not found", 404);
  return RESP.ok(res, item, "Marked resolved");
};

exports.remove = async (req, res) => {
  const item = await Grievance.findByIdAndDelete(req.params.id);
  if (!item) return RESP.bad(res, "Not found", 404);
  return RESP.ok(res, {}, "Deleted");
};
