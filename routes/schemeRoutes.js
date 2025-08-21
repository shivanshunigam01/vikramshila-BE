const router = require("express").Router();
const ctrl = require("../controllers/schemeController");
const { protect, restrict } = require("../middleware/auth");
const { uploadSchemeImages } = require("../middleware/upload");

router.get("/", ctrl.list);
router.get("/:id", ctrl.get);

router.post(
  "/",
  protect,
  restrict("admin", "editor"),
  uploadSchemeImages.array("photos", 10),
  ctrl.create
);
router.put(
  "/:id",
  protect,
  restrict("admin", "editor"),
  uploadSchemeImages.array("photos", 10),
  ctrl.update
);
router.delete("/:id", protect, restrict("admin"), ctrl.remove);

module.exports = router;
