const router = require("express").Router();
const ctrl = require("../controllers/schemeController");
const { protect, restrict } = require("../middleware/auth");
const { uploadSchemeImages } = require("../middleware/upload");

// Public routes
router.get("/", ctrl.list);
router.get("/:id", ctrl.get);

// Protected routes (admin/editor)
router.post(
  "/",
  protect,
  restrict("admin", "editor"),
  uploadSchemeImages.array("photos", 10), // Cloudinary upload
  ctrl.create
);

router.put(
  "/:id",
  protect,
  restrict("admin", "editor"),
  uploadSchemeImages.array("photos", 10), // Cloudinary upload
  ctrl.update
);

router.delete("/:id", protect, restrict("admin"), ctrl.remove);

module.exports = router;
