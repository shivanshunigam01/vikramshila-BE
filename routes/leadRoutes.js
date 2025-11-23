// routes/leadRoutes.js  (ESM)
import { Router } from "express";
import { uploadLeadKyc } from "../middleware/upload.js";
import { protect, restrict } from "../middleware/auth.js";

import {
  createLead,
  getLeads,
  getLeadById,
  assignLead,
  assignedtoDSE,
  listAssignedToMe,
  dseUpdate,
} from "../controllers/leadController.js";

import {
  createQoute,
  updateQoutation,
  getQoutationById,
  getQoutationByLeadId,
  sendQoutationEmail,
  sendQoutationSMS,
} from "../controllers/quotationController.js";

import {
  createInternalCosting,
  updateInternalCosting,
  getInternalCostingByLeadId,
} from "../controllers/internalCostingController.js";

const router = Router();

/* ========== LEADS ========== */

// Public create (website form with optional KYC uploads)
router.post("/leads-create", uploadLeadKyc, createLead);

// Admin/editor list & detail (protect so req.user is present)
router.get("/leads-get", /* restrict("admin", "editor"), */ getLeads);
router.get(
  "/leads-get/:id",
  protect,
  /* restrict("admin", "editor"), */ getLeadById
);

// Assign a lead to a DSE (admin/editor)
router.post("/assign", protect, /* restrict("admin", "editor"), */ assignLead);

// List all DSE users (admin/editor)
router.get(
  "/assignedtoDSE",
  protect,
  /* restrict("admin", "editor"), */ assignedtoDSE
);

// DSE “My Leads” (require logged-in user -> req.user is used inside controller)
router.get("/for-me", protect, listAssignedToMe);
router.get("/assigned-to-me", protect, listAssignedToMe); // alias for convenience

// DSE updates a lead (status/comments, etc.)
router.patch(
  "/:id/dse-update",    
  protect,
  /* restrict("dse", "admin", "editor"), */
  dseUpdate
);

/* ========== QUOTATIONS ========== */
// (kept names to match your FE service URLs)
router.post("/createQoute", createQoute);
router.put("/updateQoutation/:id", updateQoutation);
router.get("/leads/qoutation/:id", getQoutationById);
router.get("/leads/qoutation-by-lead/:leadId", getQoutationByLeadId);

// Send quote via Email / SMS / WhatsApp
router.post("/qoutation/:id/send-email", sendQoutationEmail);
router.post("/qoutation/:id/send-sms", sendQoutationSMS);

router.post("/internal-costing", createInternalCosting);
router.put("/internal-costing/:id", updateInternalCosting);
router.get(
  "/internal-costing-by-lead/:leadId",

  getInternalCostingByLeadId
);

export default router;
