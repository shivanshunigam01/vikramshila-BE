const Grievance = require("../models/Grievance");
const RESP = require("../utils/response");
const sendMail = require("../utils/sendMail");

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

exports.list = async (req, res) => {
  const items = await Grievance.find({}).sort({ createdAt: -1 });
  return RESP.ok(res, items);
};

exports.markInProgress = async (req, res) => {
  const item = await Grievance.findByIdAndUpdate(
    req.params.id,
    { status: "in-progress" },
    { new: true }
  );
  if (!item) return RESP.bad(res, "Not found", 404);

  // Notify user
  if (item.email && item.email !== "N/A") {
    try {
      await sendMail({
        to: item.email,
        subject: `Your grievance is under execution`,
        html: `
          <p>Dear ${item.fullName},</p>
          <p>Your grievance titled <b>${item.subject}</b> is now under execution. Our team is working on it and will update you once it is resolved.</p>
        `,
      });
    } catch (e) {
      console.error("Failed to send execution email:", e.message);
    }
  }

  return RESP.ok(res, item, "Marked as in-progress");
};

exports.markResolved = async (req, res) => {
  const item = await Grievance.findByIdAndUpdate(
    req.params.id,
    { status: "resolved" },
    { new: true }
  );
  if (!item) return RESP.bad(res, "Not found", 404);

  // Notify user
  if (item.email && item.email !== "N/A") {
    try {
      await sendMail({
        to: item.email,
        subject: `Your grievance has been resolved`,
        html: `
          <p>Dear ${item.fullName},</p>
          <p>Your grievance titled <b>${item.subject}</b> has been successfully resolved. Thank you for your patience.</p>
        `,
      });
    } catch (e) {
      console.error("Failed to send resolution email:", e.message);
    }
  }

  return RESP.ok(res, item, "Marked resolved");
};

exports.remove = async (req, res) => {
  const item = await Grievance.findByIdAndDelete(req.params.id);
  if (!item) return RESP.bad(res, "Not found", 404);
  return RESP.ok(res, {}, "Deleted");
};
