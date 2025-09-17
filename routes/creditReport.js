// routes/creditReport.js
import express from "express";
import axios from "axios";
import { generateCibilReport } from "../utils/cibilReportService.js";

const router = express.Router();

router.post("/experian-report", async (req, res) => {
  try {
    const { name, mobile, pan } = req.body;

    if (!name || !mobile || !pan) {
      return res
        .status(400)
        .json({ error: "Name, mobile, and PAN are required" });
    }

    const response = await axios.post(
      "https://kyc-api.surepass.io/api/v1/credit-report-experian/fetch-report",
      {
        name,
        consent: "Y", // ✅ Must be Y as per Surepass docs
        mobile,
        pan,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUREPASS_TOKEN}`, // keep in .env
        },
      }
    );

    // Return only what you want the frontend to see
    const data = response.data?.data || {};
    res.json({
      ok: true,
      score: data.credit_score,
      report_number: data.credit_report?.CreditProfileHeader?.ReportNumber,
      full: data, // optional: you can remove this if you don’t want to send the full report
    });
  } catch (err) {
    console.error("Surepass API error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

router.post("/download-cibil-report", async (req, res) => {
  try {
    const { cibilData, userData } = req.body;

    if (!cibilData) {
      return res.status(400).json({ error: "Missing CIBIL data" });
    }

    // Wait for PDF to finish writing
    const pdfPath = await generateCibilReport(cibilData, userData);

    res.download(pdfPath, "cibil-report.pdf", (err) => {
      if (err) {
        console.error("Error sending PDF:", err);
        res.status(500).json({ error: "Failed to send report" });
      }
    });
  } catch (err) {
    console.error("Failed to generate CIBIL PDF:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

export default router;
