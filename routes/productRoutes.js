const router = require("express").Router();
const ctrl = require("../controllers/productController");
const { protect, restrict } = require("../middleware/auth");
const { uploadProductMedia } = require("../middleware/upload");

// Public routes
router.get("/", ctrl.list);

router.post(
  "/create",
  protect,
  restrict("admin", "editor"),
  uploadProductMedia,
  ctrl.create
);

router.get("/:id", ctrl.get);

router.put(
  "/:id",
  protect,
  restrict("admin", "editor"),
  uploadProductMedia,
  ctrl.update
);
router.delete("/:id", protect, restrict("admin"), ctrl.remove);
// 🔹 Filter products
router.post("/filter", ctrl.filterProducts);

module.exports = router;
