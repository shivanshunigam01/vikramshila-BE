const Enquiry = require("../models/Enquiry");
// const { sendMail } = require("../middleware/nodemailer");
const RESP = require("../utils/response");

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
  //   try {
  //     const doc = await Enquiry.create(req.body);
  //     try {
  //       await sendMail({
  //         to: process.env.ADMIN_EMAIL,
  //         subject: `New Enquiry from ${doc.fullName}`,
  //         html: `<p><b>Name:</b> ${doc.fullName}</p>
  //               <p><b>Mobile:</b> ${doc.mobileNumber}</p>
  //               <p><b>State:</b> ${doc.state || ""}</p>
  //               <p><b>Pincode:</b> ${doc.pincode || ""}</p>
  //               <p><b>Product:</b> ${doc.product || ""}</p>
  //               <p><b>WhatsApp:</b> ${doc.whatsappConsent ? "Yes" : "No"}</p>`,
  //       });
  //     } catch (e) { /* log only */ }
  //     return RESP.created(res, doc, "Enquiry received");
  //   } catch (e) { return RESP.bad(res, e.message, 400); }
};

exports.list = async (req, res) => {
  const { filter, contacted } = req.query;
  const q = {};
  if (filter) q.createdAt = dateFilter(filter);
  if (typeof contacted !== "undefined") q.contacted = contacted === "true";
  const items = await Enquiry.find(q).sort({ createdAt: -1 });
  return RESP.ok(res, items);
};

exports.markContacted = async (req, res) => {
  const item = await Enquiry.findByIdAndUpdate(
    req.params.id,
    { contacted: true },
    { new: true }
  );
  if (!item) return RESP.bad(res, "Not found", 404);
  return RESP.ok(res, item, "Marked contacted");
};

exports.remove = async (req, res) => {
  const item = await Enquiry.findByIdAndDelete(req.params.id);
  if (!item) return RESP.bad(res, "Not found", 404);
  return RESP.ok(res, {}, "Deleted");
};
