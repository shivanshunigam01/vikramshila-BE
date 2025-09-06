const router = require("express").Router();
const ctrl = require("../controllers/productController");
const { protect, restrict } = require("../middleware/auth");
const { uploadProductMedia } = require("../middleware/upload");

router.get("/applications/list", ctrl.getUniqueApplications);
// Public routes
router.get("/", ctrl.list);
router.get("/:id", ctrl.get);

// ✅ Brochure download route - MAIN METHOD
router.get("/:id/download-brochure", ctrl.downloadBrochure);

// Protected routes
router.post(
  "/create",
  protect,
  restrict("admin", "editor"),
  uploadProductMedia,
  ctrl.create
);

router.put(
  "/:id",
  protect,
  restrict("admin", "editor"),
  uploadProductMedia,
  ctrl.update
);

router.delete("/:id", protect, restrict("admin"), ctrl.remove);

// Filter products
router.post("/filter", ctrl.filterProducts);

// ✅ Alternative brochure access route (if needed)
router.get("/:id/brochure", async (req, res) => {
  try {
    const Product = require("../models/Product");
    const product = await Product.findById(req.params.id);

    if (!product?.brochureFile?.path) {
      return res.status(404).json({ error: "Brochure not found" });
    }

    const fs = require("fs");
    const path = require("path");

    // Check if file exists
    if (!fs.existsSync(product.brochureFile.path)) {
      return res
        .status(404)
        .json({ error: "Brochure file not found on server" });
    }

    // Set headers for inline viewing (opens in browser)
    res.setHeader(
      "Content-Type",
      product.brochureFile.mimetype || "application/pdf"
    );
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${
        product.brochureFile.originalName || "brochure.pdf"
      }"`
    );

    // Stream the file
    const fileStream = fs.createReadStream(product.brochureFile.path);
    fileStream.pipe(res);

    fileStream.on("error", (error) => {
      console.error("File stream error:", error);
      res.status(500).json({ error: "Error reading brochure file" });
    });
  } catch (error) {
    console.error("Brochure access error:", error);
    res.status(500).json({ error: "Failed to access brochure" });
  }
});

module.exports = router;
