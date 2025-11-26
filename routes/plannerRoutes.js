import express from "express";
import {
  createPlannerEntry,
  getPlannerByDse,
  getPlannerAdmin,
  getPlannerById,
  updatePlannerEntry,
  updatePlannerStatus,
  deletePlannerEntry,
  addFollowUpNote,
} from "../controllers/plannerController.js";

import authUser from "../middleware/authUser.js";

const router = express.Router();

// ----------------- DSE ROUTES -----------------
// DSE (role = "dse")
router.post("/", authUser, createPlannerEntry);
router.get("/dse/:dseId", authUser, getPlannerByDse);
router.patch("/:id/status", authUser, updatePlannerStatus);

// ADMIN (role = "admin")
router.get("/", authUser, getPlannerAdmin);
router.patch("/:id", authUser, updatePlannerEntry);
router.delete("/:id", authUser, deletePlannerEntry);

// shared
router.get("/:id", authUser, getPlannerById);
router.patch("/:id/follow-up", authUser, addFollowUpNote);

export default router;
