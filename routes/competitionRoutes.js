// routes/competitionRoutes.js
import express from "express";
import {
  createCompetitionProduct,
  getCompetitionProducts,
  updateCompetitionProduct,
  deleteCompetitionProduct,
  filterCompetitionAndRealProducts,
} from "../controllers/competitionController.js";
import { uploadCompetitionMedia } from "../middleware/upload.js"; // ✅ new import

const router = express.Router();

// ✅ Create product (Cloudinary images + local brochure)
router.post("/create", uploadCompetitionMedia, createCompetitionProduct);

// ✅ Update product
router.put("/update/:id", uploadCompetitionMedia, updateCompetitionProduct);

// ✅ Fetch all
router.get("/list", getCompetitionProducts);

// ✅ Delete
router.delete("/delete/:id", deleteCompetitionProduct);

// ✅ Filter for comparison
router.post("/compare-filter", filterCompetitionAndRealProducts);

export default router;
