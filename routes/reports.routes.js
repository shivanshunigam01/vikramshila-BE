// routes/reports.js
import express from "express";
import {
  getFilters,
  getEnquiryReport,
  getLeadConversionReport,
  getSalesC3Report,
  getInternalCostingReport,
  assignLead,
  assignEnquiry,
} from "../controllers/reports.controller.js";

const router = express.Router();

/**
 * MOUNT at: app.use("/api/reports", router)
 *
 * Endpoints:
 *   GET  /api/reports/filters
 *   GET  /api/reports/enquiries
 *   GET  /api/reports/conversions
 *   GET  /api/reports/sales-c3
 *   GET  /api/reports/internal-costing
 *   POST /api/reports/assign-lead
 *   POST /api/reports/assign-enquiry
 */

router.get("/filters", getFilters);
router.get("/enquiries", getEnquiryReport);
router.get("/conversions", getLeadConversionReport);
router.get("/sales-c3", getSalesC3Report);
router.get("/internal-costing", getInternalCostingReport);
router.post("/assign-lead", assignLead);
router.post("/assign-enquiry", assignEnquiry);

export default router;
