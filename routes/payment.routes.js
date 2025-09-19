const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const axios = require("axios");

const router = express.Router();

// Razorpay instance
const razor = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 👉 Step 1: Create Razorpay order (₹75)
router.post("/razorpay/order", async (req, res) => {
  try {
    const order = await razor.orders.create({
      amount: 75 * 100, // Razorpay expects paise
      currency: "INR",
      receipt: `cibil_${Date.now()}`,
    });
    res.json(order);
  } catch (err) {
    console.error("Razorpay order error:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// 👉 Step 2: Verify payment + fetch CIBIL
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

    // Verify Razorpay signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ ok: false, error: "Invalid Razorpay signature" });
    }

    // ✅ Payment verified → call Surepass CIBIL API
    const spRes = await axios.post(
      "https://kyc-api.surepass.io/api/v1/credit-report-experian/fetch-report",
      {
        name,
        consent: "Y",
        mobile,
        pan,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUREPASS_TOKEN}`,
        },
      }
    );

    const data = spRes.data?.data || {};
    res.json({
      ok: true,
      score: data.credit_score,
      report_number: data.credit_report?.CreditProfileHeader?.ReportNumber,
      report_date: data.credit_report?.CreditProfileHeader?.ReportDate,
      report_time: data.credit_report?.CreditProfileHeader?.ReportTime,
      raw: data, // full response if you want to store/log
    });
  } catch (err) {
    console.error("verify-cibil error:", err.response?.data || err.message);
    res
      .status(500)
      .json({ ok: false, error: "Failed to verify payment or fetch CIBIL" });
  }
});

module.exports = router;
