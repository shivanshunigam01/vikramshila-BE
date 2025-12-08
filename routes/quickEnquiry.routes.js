import express from "express";
import {
  submitQuickEnquiry,
  listQuickEnquiries,
  getQuickEnquiry,
} from "../controllers/quickEnquiry.controller.js";

const router = express.Router();

// Public route — popup enquiry submits here
router.post("/create", submitQuickEnquiry);

// Admin routes (optional)
router.get("/", listQuickEnquiries);
router.get("/:id", getQuickEnquiry);

export default router;
