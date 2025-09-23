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
  console.error("Missing SUREPASS_TOKEN (JWT) in environment");
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
      amount: 75 * 100, // paise
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
   Step 2: Verify payment + fetch CIBIL (JSON)
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
   (No Razorpay UI) Fetch Experian PDF
   POST /payment/experian-pdf
   Body: { name, mobile, pan, consent?="Y", raw?=false }
========================= */
router.post("/experian-pdf", async (req, res) => {
  try {
    const { name, mobile, pan, consent = "Y", raw = false } = req.body || {};

    if (!name || !mobile || !pan) {
      return res.status(400).json({
        ok: false,
        error: "name, mobile, and pan are required",
      });
    }

    const spRes = await axios.post(
      SUREPASS_PDF_ENDPOINT,
      { name, consent, mobile, pan, ...(raw ? { raw: true } : {}) },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUREPASS_TOKEN}`, // keep this ONLY on server
        },
        timeout: 30000,
      }
    );

    const { data, success, message, message_code, status_code } =
      spRes.data || {};
    if (!success) {
      return res.status(400).json({
        ok: false,
        error: message || "Surepass PDF fetch failed",
        code: message_code,
        status_code,
      });
    }

    return res.json({
      ok: true,
      score: data?.credit_score,
      client_id: data?.client_id,
      name: data?.name,
      mobile: data?.mobile,
      pan: data?.pan,
      credit_report_link: data?.credit_report_link, // secure signed URL
    });
  } catch (err) {
    const status = err?.response?.status || 500;
    const payload = err?.response?.data || { message: err.message };
    console.error("[experian-pdf] error:", {
      endpoint: SUREPASS_PDF_ENDPOINT,
      status,
      payload,
    });
    return res.status(status).json({
      ok: false,
      error: payload?.message || "Failed to fetch Experian PDF",
      details: payload,
    });
  }
});

module.exports = router;
