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
    const keyId = (process.env.RAZORPAY_KEY_ID || "").trim();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
    if (!keyId || !keySecret) {
      return res.status(500).json({ error: "Razorpay keys missing on server" });
    }

    const order = await razor.orders.create({
      amount: 1 * 100,
      currency: "INR",
      receipt: `cibil_${Date.now()}`,
    });

    console.log("Surepass URL:", SUREPASS_BASE_URL);
    console.log("Surepass token prefix:", SUREPASS_TOKEN?.slice(0, 12));
    // IMPORTANT: send the key used to create this order
    res.json({ ...order, key_id: keyId });
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
    const mobileStr = String(mobile);
    const panStr = String(pan).toUpperCase();
    if (!/^\d{10}$/.test(mobileStr)) {
      return res
        .status(400)
        .json({ ok: false, error: "mobile must be 10 digits" });
    }
    if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(panStr)) {
      return res
        .status(400)
        .json({ ok: false, error: "PAN format invalid (ABCDE1234F)" });
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

    // Call Surepass
    const spRes = await axios.post(
      SUREPASS_JSON_ENDPOINT,
      { name, consent: "Y", mobile: mobileStr, pan: panStr },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUREPASS_TOKEN}`,
        },
        timeout: 45000,
        validateStatus: () => true, // handle non-2xx ourselves
      }
    );

    if (spRes.status < 200 || spRes.status >= 300) {
      // Bubble up the real Surepass error
      console.error("Surepass non-2xx:", spRes.status, spRes.data);
      return res.status(spRes.status).json({
        ok: false,
        source: "surepass",
        status: spRes.status,
        error: spRes.data?.message || spRes.data?.error || "Surepass error",
        details: spRes.data,
      });
    }

    const data = spRes.data?.data || {};
    return res.json({
      ok: true,
      score: data.credit_score ?? null,
      report_number:
        data.credit_report?.CreditProfileHeader?.ReportNumber ?? null,
      report_date: data.credit_report?.CreditProfileHeader?.ReportDate ?? null,
      report_time: data.credit_report?.CreditProfileHeader?.ReportTime ?? null,
      raw: data,
    });
  } catch (err) {
    // Axios/network diagnostics
    const ax = err && err.isAxiosError ? err : null;
    const status = ax?.response?.status || 500;
    const details = ax?.response?.data ||
      ax?.toJSON?.() || {
        message: err?.message,
        code: err?.code,
        errno: err?.errno,
        syscall: err?.syscall,
      };
    console.error("verify-cibil fatal:", status, details);
    return res.status(status).json({
      ok: false,
      source: "server",
      error: "Failed to verify payment or fetch CIBIL",
      details,
    });
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
