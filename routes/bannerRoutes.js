const express = require("express");
const router = express.Router();
const { upload } = require("../middleware/upload");
const {
  uploadBanner,
  getBanners,
  deleteBanner,
} = require("../controllers/bannerController");

// Upload banner
router.post("/upload", upload.single("banner"), uploadBanner);

// Get all banners
router.get("/", getBanners);

// Delete banner
router.delete("/:id", deleteBanner);

module.exports = router;
