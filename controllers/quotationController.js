// controllers/quotationController.js
import Quotation from "../models/Quotation.js";
import Lead from "../models/Lead.js";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sendMail from "../utils/sendMail.js";
import sendSms from "../utils/sendSms.js";
import { htmlToPdfBuffer } from "../utils/pdf.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const inr = (n) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

/**
 * POST /leads/createQoute
 * Body: matches your FE CreateQoutePayload
 */
export const createQoute = async (req, res) => {
  try {
    const payload = req.body;

    // basic validations (aligns with FE checks)
    if (!payload?.leadId) {
      return res
        .status(400)
        .json({ success: false, message: "leadId is required" });
    }
    if (!payload?.customerName || !payload?.contactNumber || !payload?.model) {
      return res.status(400).json({
        success: false,
        message: "customerName, contactNumber and model are required",
      });
    }

    // ensure lead exists
    const lead = await Lead.findById(payload.leadId);
    if (!lead) {
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });
    }

    const created = await Quotation.create({
      ...payload,
    });

    // optional: mark lead status as "quotation" (your FE also does this locally)
    if (lead.status !== "quotation") {
      await Lead.findByIdAndUpdate(lead._id, { status: "quotation" });
    }

    return res.status(201).json({
      success: true,
      message: "Quotation created",
      data: created,
    });
  } catch (err) {
    console.error("createQoute error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /leads/updateQoutation/:id
 */
export const updateQoutation = async (req, res) => {
  try {
    const { id } = req.params; // quotation _id
    const updates = req.body || {};

    const updated = await Quotation.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Quotation not found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Quotation updated", data: updated });
  } catch (err) {
    console.error("updateQoutation error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /leads/qoutation/:id
 */
export const getQoutationById = async (req, res) => {
  try {
    const q = await Quotation.findById(req.params.id);
    if (!q)
      return res
        .status(404)
        .json({ success: false, message: "Quotation not found" });
    return res.status(200).json({ success: true, data: q });
  } catch (err) {
    console.error("getQoutationById error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /leads/qoutation-by-lead/:leadId
 * Return the latest quotation for a lead (or first if only one).
 */
export const getQoutationByLeadId = async (req, res) => {
  try {
    const { leadId } = req.params;
    const q = await Quotation.findOne({ leadId }).sort({ createdAt: -1 });
    if (!q) {
      return res
        .status(404)
        .json({ success: false, message: "No quotation for this lead" });
    }
    return res.status(200).json({ success: true, data: q });
  } catch (err) {
    console.error("getQoutationByLeadId error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const renderQoutationHTML = (q, lead) => {
  const today = new Date().toLocaleDateString("en-IN");
  const contactName = q.customerName || lead?.userName || "Customer";
  const salesExec = q.salesExecutive || "Sales Team";
  return `
  <div style="font-family:Arial,sans-serif;color:#111">
    <div style="text-align:center;border-bottom:2px solid #1f2937;padding-bottom:10px;margin-bottom:20px">
      <div style="font-size:22px;font-weight:700">Vikramshila Automobiles Pvt Ltd.</div>
      <div style="font-size:13px;line-height:1.4">
        Authorized Dealer - Tata Commercial Vehicles<br/>
        Address: Bhagalpur, Banka & Khagaria | Contact: +91-8406991610
      </div>
      <div style="font-size:16px;font-weight:700;color:#2563eb;margin-top:8px">VEHICLE QUOTATION</div>
      <div style="font-size:13px">Date: ${today}</div>
    </div>

    <h3 style="margin:0 0 8px 0">Customer Details</h3>
    <table width="100%" cellspacing="0" cellpadding="6" style="border-collapse:collapse;border:1px solid #ccc">
      <tr>
        <td style="border:1px solid #ccc;width:25%"><b>Customer Name</b></td>
        <td style="border:1px solid #ccc">${contactName}</td>
        <td style="border:1px solid #ccc;width:25%"><b>Contact Number</b></td>
        <td style="border:1px solid #ccc">${
          q.contactNumber || lead?.userPhone || "-"
        }</td>
      </tr>
      <tr>
        <td style="border:1px solid #ccc"><b>Address</b></td>
        <td style="border:1px solid #ccc" colspan="3">${q.address || "-"}</td>
      </tr>
      <tr>
        <td style="border:1px solid #ccc"><b>GST No</b></td>
        <td style="border:1px solid #ccc">${q.gstNo || "-"}</td>
        <td style="border:1px solid #ccc"><b>PAN No</b></td>
        <td style="border:1px solid #ccc">${q.panNo || "-"}</td>
      </tr>
    </table>

    <h3 style="margin:16px 0 8px 0">Vehicle Specification</h3>
    <table width="100%" cellspacing="0" cellpadding="6" style="border-collapse:collapse;border:1px solid #ccc">
      <tr>
        <td style="border:1px solid #ccc;width:25%"><b>Model</b></td>
        <td style="border:1px solid #ccc">${q.model || "-"}</td>
        <td style="border:1px solid #ccc;width:25%"><b>Variant</b></td>
        <td style="border:1px solid #ccc">${q.variant || "-"}</td>
      </tr>
      <tr>
        <td style="border:1px solid #ccc"><b>Color</b></td>
        <td style="border:1px solid #ccc">${q.color || "-"}</td>
        <td style="border:1px solid #ccc"><b>Validity</b></td>
        <td style="border:1px solid #ccc">${q.validityPeriod || "-"}</td>
      </tr>
    </table>

    <h3 style="margin:16px 0 8px 0">Price Breakdown</h3>
    <table width="100%" cellspacing="0" cellpadding="6" style="border-collapse:collapse;border:1px solid #ccc">
      <tr><td style="border:1px solid #ccc">Ex-Showroom Price</td><td style="border:1px solid #ccc;text-align:right">₹ ${inr(
        q.exShowroomPrice
      )}</td></tr>
      <tr><td style="border:1px solid #ccc">RTO / Road Tax</td><td style="border:1px solid #ccc;text-align:right">₹ ${inr(
        q.rtoTax
      )}</td></tr>
      <tr><td style="border:1px solid #ccc">Insurance Premium</td><td style="border:1px solid #ccc;text-align:right">₹ ${inr(
        q.insurance
      )}</td></tr>
      <tr><td style="border:1px solid #ccc">Accessories</td><td style="border:1px solid #ccc;text-align:right">₹ ${inr(
        q.accessories
      )}</td></tr>
      <tr><td style="border:1px solid #ccc">Extended Warranty</td><td style="border:1px solid #ccc;text-align:right">₹ ${inr(
        q.extendedWarranty
      )}</td></tr>
      <tr style="background:#e8f5e9"><td style="border:1px solid #ccc"><b>Total On-Road Price</b></td><td style="border:1px solid #ccc;text-align:right"><b>₹ ${inr(
        q.totalOnRoadPrice
      )}</b></td></tr>
    </table>

    ${
      Number(q.totalDiscount || 0) > 0
        ? `
    <h3 style="margin:16px 0 8px 0">Discounts & Offers</h3>
    <table width="100%" cellspacing="0" cellpadding="6" style="border-collapse:collapse;border:1px solid #ccc">
      ${
        Number(q.consumerOffer || 0)
          ? `<tr><td style="border:1px solid #ccc">Consumer Offer</td><td style="border:1px solid #ccc;text-align:right">- ₹ ${inr(
              q.consumerOffer
            )}</td></tr>`
          : ""
      }
      ${
        Number(q.exchangeBonus || 0)
          ? `<tr><td style="border:1px solid #ccc">Exchange Bonus</td><td style="border:1px solid #ccc;text-align:right">- ₹ ${inr(
              q.exchangeBonus
            )}</td></tr>`
          : ""
      }
      ${
        Number(q.corporateDiscount || 0)
          ? `<tr><td style="border:1px solid #ccc">Corporate Discount</td><td style="border:1px solid #ccc;text-align:right">- ₹ ${inr(
              q.corporateDiscount
            )}</td></tr>`
          : ""
      }
      ${
        Number(q.additionalDiscount || 0)
          ? `<tr><td style="border:1px solid #ccc">Additional Discount</td><td style="border:1px solid #ccc;text-align:right">- ₹ ${inr(
              q.additionalDiscount
            )}</td></tr>`
          : ""
      }
      <tr style="color:#b91c1c"><td style="border:1px solid #ccc"><b>Total Discounts</b></td><td style="border:1px solid #ccc;text-align:right"><b>- ₹ ${inr(
        q.totalDiscount
      )}</b></td></tr>
    </table>`
        : ""
    }

    <h3 style="margin:16px 0 8px 0">Net Amount</h3>
    <table width="100%" cellspacing="0" cellpadding="6" style="border-collapse:collapse;border:2px solid #bbf7d0;background:#ecfdf5">
      <tr>
        <td style="border:1px solid #bbf7d0"><b>Net Customer Payable Amount</b></td>
        <td style="border:1px solid #bbf7d0;text-align:right"><b>₹ ${inr(
          q.netSellingPrice
        )}</b></td>
      </tr>
    </table>

    ${
      Number(q.loanAmount || 0)
        ? `
    <h3 style="margin:16px 0 8px 0">Finance Details</h3>
    <table width="100%" cellspacing="0" cellpadding="6" style="border-collapse:collapse;border:1px solid #ccc">
      <tr><td style="border:1px solid #ccc">Loan Amount</td><td style="border:1px solid #ccc">₹ ${inr(
        q.loanAmount
      )}</td><td style="border:1px solid #ccc">Down Payment</td><td style="border:1px solid #ccc">₹ ${inr(
            q.downPayment
          )}</td></tr>
      <tr><td style="border:1px solid #ccc">Rate of Interest</td><td style="border:1px solid #ccc">${
        q.rateOfInterest || "-"
      }%</td><td style="border:1px solid #ccc">Tenure</td><td style="border:1px solid #ccc">${
            q.tenure || "-"
          } months</td></tr>
      <tr><td style="border:1px solid #ccc">Processing Fee</td><td style="border:1px solid #ccc">₹ ${inr(
        q.processingFee
      )}</td><td style="border:1px solid #ccc">EMI</td><td style="border:1px solid #ccc">₹ ${inr(
            q.emi
          )}/month</td></tr>
    </table>`
        : ""
    }

    <div style="margin-top:18px;border-top:1px solid #ddd;padding-top:8px">
      <div style="font-size:13px">For any queries, contact:</div>
      <div style="font-weight:600">${salesExec}</div>
      <div style="font-size:13px">Vikramshila Automobiles Pvt Ltd.</div>
    </div>
  </div>`;
};

const renderQoutationText = (q) =>
  `Vehicle Quotation
Model: ${q.model || "-"} ${q.variant ? "(" + q.variant + ")" : ""}
On-Road: ₹ ${inr(q.totalOnRoadPrice)}
Discounts: ₹ ${inr(q.totalDiscount || 0)}
Net Payable: ₹ ${inr(q.netSellingPrice)}
${
  q.loanAmount
    ? `Loan: ₹ ${inr(q.loanAmount)}, Tenure: ${q.tenure}m, EMI: ₹ ${inr(
        q.emi
      )}/mo`
    : ""
}

Thank you!
Vikramshila Automobiles`.trim();

// Save PDF so it can be linked in WhatsApp (Twilio mediaUrl must be public)
function savePdfForPublic(buf, filename) {
  const outDir = path.join(__dirname, "..", "public", "quotations");
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, filename);
  fs.writeFileSync(filePath, buf);
  const base = process.env.PUBLIC_BASE_URL?.replace(/\/+$/, "");
  const url = `${base}/public/quotations/${encodeURIComponent(filename)}`;
  return { filePath, url };
}

export const sendQoutationEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { to } = req.body || {};

    const q = await Quotation.findById(id);
    if (!q)
      return res
        .status(404)
        .json({ success: false, message: "Quotation not found" });

    const lead = await Lead.findById(q.leadId);
    const toEmail = to || lead?.userEmail;
    if (!toEmail) {
      return res.status(400).json({
        success: false,
        message:
          "Recipient email not found. Provide 'to' or ensure lead.userEmail exists.",
      });
    }

    const html = renderQoutationHTML(q, lead);
    const pdfBuffer = await htmlToPdfBuffer(html);
    const filename = `Quotation_${(q.model || "Vehicle").replace(
      /\s+/g,
      "_"
    )}_${new Date().toISOString().slice(0, 10)}.pdf`;

    await sendMail({
      to: toEmail,
      subject: `Vehicle Quotation - ${
        q.model || "Vehicle"
      } (${new Date().toLocaleDateString("en-IN")})`,
      html,
      attachments: [
        {
          filename,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    return res
      .status(200)
      .json({ success: true, message: `Quotation emailed to ${toEmail}` });
  } catch (e) {
    console.error("sendQoutationEmail error:", e);
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const sendQoutationSMS = async (req, res) => {
  try {
    const { id } = req.params;
    const { to, via = "sms" } = req.body || {};

    const q = await Quotation.findById(id);
    if (!q)
      return res
        .status(404)
        .json({ success: false, message: "Quotation not found" });

    const lead = await Lead.findById(q.leadId);
    const toNumber = to || q.contactNumber || lead?.userPhone;
    if (!toNumber) {
      return res.status(400).json({
        success: false,
        message:
          "Recipient phone not found. Provide 'to' or ensure contactNumber/userPhone exists.",
      });
    }

    const textBody = renderQoutationText(q);

    // If WhatsApp, attach the PDF via mediaUrl link
    let mediaUrl;
    if (via === "whatsapp") {
      const html = renderQoutationHTML(q, lead);
      const pdfBuffer = await htmlToPdfBuffer(html);
      const filename = `Quotation_${(q.model || "Vehicle").replace(
        /\s+/g,
        "_"
      )}_${Date.now()}.pdf`;
      const { url } = savePdfForPublic(pdfBuffer, filename);
      mediaUrl = [url]; // Twilio WhatsApp supports mediaUrl array
    }

    await sendSms({ to: toNumber, body: textBody, via, mediaUrl });

    // For SMS in India, MMS attachments usually don't work — we could include a link too if you want:
    // if (via === "sms" && !mediaUrl) { include a public link to view PDF on your site }

    return res.status(200).json({
      success: true,
      message: `Quotation sent via ${via} to ${toNumber}`,
    });
  } catch (e) {
    console.error("sendQoutationSMS error:", e);
    return res.status(500).json({ success: false, message: e.message });
  }
};
