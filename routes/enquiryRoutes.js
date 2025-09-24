// routes/enquiryRoutes.js
import express from "express";
import {
  listEnquiries,
  listAssignedToMe,
  getEnquiryById,
  createEnquiry,
  updateEnquiry,
  assignEnquiry,
  dseUpdateEnquiry,
} from "../controllers/enquiryController.js";

// Optional auth middlewares. If you have them, uncomment/use.
// import { requireAuth } from "../middlewares/requireAuth.js";

const router = express.Router();

/* ---------------- Specific routes FIRST ---------------- */
// router.use(requireAuth); // if your API is protected globally for these routes

// List all (admin panel)
router.get("/list", listEnquiries);

// Current user's assigned enquiries (DSE)
router.get("/assigned-to-me", listAssignedToMe);

// Assign an enquiry
router.post("/assign", assignEnquiry);

/* ----------- CRUD base (create + list alias) ----------- */
router.post("/", createEnquiry);
router.get("/", listEnquiries);

/* --------------- ID-based routes (regex) --------------- */
router.patch("/:id([0-9a-fA-F]{24})/dse-update", dseUpdateEnquiry);
router.put("/:id([0-9a-fA-F]{24})", updateEnquiry);
router.get("/:id([0-9a-fA-F]{24})", getEnquiryById);

export default router;
