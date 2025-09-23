const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const axios = require("axios");

const router = express.Router();

/* =========================
   Env for Surepass
========================= */
const SUREPASS_BASE_URL = (
  process.env.SUREPASS_BASE_URL || "https://kyc-api.surepass.io"
).trim();
const SUREPASS_TOKEN = (process.env.SUREPASS_TOKEN || "").trim();

if (!/^https?:\/\//i.test(SUREPASS_BASE_URL)) {
  console.error(
    `Misconfigured SUREPASS_BASE_URL: "${SUREPASS_BASE_URL}" (must start with http/https)`
  );
}
if (!SUREPASS_TOKEN) {
  console.error("❌ Missing SUREPASS_TOKEN (JWT) in environment");
}

// Build endpoints robustly
const SUREPASS_JSON_ENDPOINT = new URL(
  "/api/v1/credit-report-experian/fetch-report",
  SUREPASS_BASE_URL
).toString();

const SUREPASS_PDF_ENDPOINT = new URL(
  "/api/v1/credit-report-experian/fetch-report-pdf",
  SUREPASS_BASE_URL
).toString();

/* =========================
   Razorpay instance
========================= */
const razor = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* =========================
   Step 1: Create Razorpay order (₹75)
========================= */
router.post("/razorpay/order", async (req, res) => {
  try {
    const order = await razor.orders.create({
      amount: 75 * 100, // in paise
      currency: "INR",
      receipt: `cibil_${Date.now()}`,
    });
    res.json(order);
  } catch (err) {
    console.error("Razorpay order error:", err?.response?.data || err.message);
    res.status(500).json({ error: "Failed to create order" });
  }
});

/* =========================
   Step 2: Verify payment + fetch CIBIL JSON
========================= */
router.post("/razorpay/verify-cibil", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      name,
      mobile,
      pan,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing Razorpay verification fields" });
    }
    if (!name || !mobile || !pan) {
      return res
        .status(400)
        .json({ ok: false, error: "name, mobile, and pan are required" });
    }

    // Verify Razorpay signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ ok: false, error: "Invalid Razorpay signature" });
    }

    // Payment verified → call Surepass JSON API
    const spRes = await axios.post(
      SUREPASS_JSON_ENDPOINT,
      { name, consent: "Y", mobile, pan },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUREPASS_TOKEN}`,
        },
        timeout: 30000,
      }
    );

    const data = spRes.data?.data || {};
    return res.json({
      ok: true,
      score: data.credit_score,
      report_number: data.credit_report?.CreditProfileHeader?.ReportNumber,
      report_date: data.credit_report?.CreditProfileHeader?.ReportDate,
      report_time: data.credit_report?.CreditProfileHeader?.ReportTime,
      raw: data,
    });
  } catch (err) {
    console.error("verify-cibil error:", err?.response?.data || err.message);
    res
      .status(500)
      .json({ ok: false, error: "Failed to verify payment or fetch CIBIL" });
  }
});

/* =========================
   Step 3: Fetch Experian PDF (Direct API)
   POST /payment/experian-pdf
========================= */
router.post("/experian-pdf", async (req, res) => {
  try {
    const { name, mobile, pan, consent = "Y" } = req.body;

    if (!name || !mobile || !pan) {
      return res
        .status(400)
        .json({ ok: false, error: "name, mobile, and pan are required" });
    }

    // Call Surepass PDF API
    const spRes = await axios.post(
      SUREPASS_PDF_ENDPOINT,
      { name, consent, mobile, pan },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUREPASS_TOKEN}`,
        },
        timeout: 30000,
      }
    );

    const link =
      spRes.data?.data?.credit_report_link ||
      spRes.data?.data?.report_url ||
      spRes.data?.credit_report_link;

    if (!link) {
      throw new Error("No PDF link found in Surepass response");
    }

    return res.json({ ok: true, credit_report_link: link });
  } catch (err) {
    console.error("experian-pdf error:", err?.response?.data || err.message);
    res.status(500).json({ ok: false, error: "Failed to fetch Experian PDF" });
  }
});

module.exports = router;
