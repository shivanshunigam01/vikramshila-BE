const router = require("express").Router();
const ctrl = require("../controllers/productController");
const { protect, restrict } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

// reuse your makeStorage
const { makeStorage } = require("../utils/multerConfig");

// define combined uploader for products
const uploadProductMedia = multer({
  storage: makeStorage("products"),
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) return cb(null, true);
    if (file.mimetype === "application/pdf") return cb(null, true);
    cb(new Error("Only image or PDF files are allowed!"));
  },
}).fields([
  { name: "images", maxCount: 10 }, // multiple images
  { name: "brochure", maxCount: 1 }, // single pdf
]);

// public
router.get("/", ctrl.list);
router.get("/:id", ctrl.get);

// protected
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

module.exports = router;
