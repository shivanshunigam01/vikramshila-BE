// routes/reports.js
import express from "express";
import {
  getFilters,
  getEnquiryReport,
  getLeadConversionReport,
  getSalesC3Report,
  getInternalCostingReport,
  postTrackingPing,
  getDseMovementPolyline,
  getDseMovementGeoJSON,
  getDseMovementSummary,
} from "../controllers/reports.controller.js";

const r = express.Router();

r.get("/reports/filters", getFilters);
r.get("/reports/enquiries", getEnquiryReport);
r.get("/reports/conversions", getLeadConversionReport);
r.get("/reports/sales-c3", getSalesC3Report);
r.get("/reports/internal-costing", getInternalCostingReport);

r.post("/reports/dse/ping", postTrackingPing);
r.get("/reports/dse/movement/polyline", getDseMovementPolyline);
r.get("/reports/dse/movement/geojson", getDseMovementGeoJSON);
r.get("/reports/dse/movement/summary", getDseMovementSummary);

export default r;
