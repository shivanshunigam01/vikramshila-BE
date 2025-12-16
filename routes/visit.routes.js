import express from "express";
import {
  trackVisit,
  getDashboardStats,
} from "../controllers/visit.controller.js";
import { extractClientInfo } from "../middleware/extractClientInfo.js";
// import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

/* ---------- PUBLIC (USER PANEL / WEBSITE) ---------- */
router.post("/track", extractClientInfo, trackVisit);

/* ---------- ADMIN PANEL ---------- */
// router.use(authMiddleware);
router.get("/admin/dashboard", getDashboardStats);

export default router;
    