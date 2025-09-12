const express = require("express");
const { uploadLeadKyc } = require("../middleware/upload");
const {
  createLead,
  getLeads,
  getLeadById,
} = require("../controllers/leadController");

const router = express.Router();

// POST - submit a new lead/quote
router.post("/leads-create", uploadLeadKyc, createLead); // Aadhaar & PAN optional
// GET - fetch all leads
router.get("/leads-get", getLeads);

// GET - fetch single lead by ID
router.get("/leads-get/:id", getLeadById);

module.exports = router;
