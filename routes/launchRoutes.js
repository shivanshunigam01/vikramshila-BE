const router = require("express").Router();
const ctrl = require("../controllers/launchController");
const { protect, restrict } = require("../middleware/auth");
const { uploadLaunchMedia } = require("../middleware/upload");

// Public
router.get("/", ctrl.list);
router.get("/:id", ctrl.get);

// Protected
router.post(
  "/",
  protect,
  restrict("admin", "editor"),
  uploadLaunchMedia,
  ctrl.create
);

router.put(
  "/:id",
  protect,
  restrict("admin", "editor"),
  uploadLaunchMedia,
  ctrl.update
);

router.delete("/:id", protect, restrict("admin"), ctrl.remove);

// ✅ Brochure download
router.get("/:id/download-brochure", ctrl.downloadBrochure);

module.exports = router;
