// routes/competitionRoutes.js
import express from "express";
import {
  createCompetitionProduct,
  getCompetitionProducts,
  updateCompetitionProduct,
  deleteCompetitionProduct,
  filterCompetitionAndRealProducts,
  filterProductsAndCompetition,
  getCompetitionProductById,
  downloadCompetitionBrochure,
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
router.post("/filter", filterProductsAndCompetition);
// ✅ Single competitor product details
router.get("/:id", getCompetitionProductById);

// ✅ Download competitor brochure
router.get("/competition-products/:id/brochure", downloadCompetitionBrochure);
export default router;
