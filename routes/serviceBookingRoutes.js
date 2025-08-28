const express = require("express");
const ctrl = require("../controllers/serviceBookingController");
const { protect, restrict } = require("../middleware/auth");
const { uploadSingle } = require("../middleware/upload");

const router = express.Router();

// Public – create booking
router.post("/", uploadSingle("attachment"), ctrl.create);

// Admin/Editor protected routes
router.get("/", protect, restrict("admin", "editor"), ctrl.list);
router.get("/:id", protect, restrict("admin", "editor"), ctrl.get);
router.put(
  "/:id",
  protect,
  restrict("admin", "editor"),
  uploadSingle("attachment"),
  ctrl.update
);
router.delete("/:id", protect, restrict("admin"), ctrl.remove);

module.exports = router;
