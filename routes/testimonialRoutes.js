const router = require("express").Router();
const testimonialController = require("../controllers/testimonialController.js");
const { protect, restrict } = require("../middleware/auth");
const { uploadTestimonialImages } = require("../middleware/upload");

// Get all testimonials
router.get("/", testimonialController.list);

// Get a single testimonial
router.get("/:id", testimonialController.get);

// Create testimonial (image upload required)
router.post(
  "/",
  protect,
  restrict("admin", "editor"),
  uploadTestimonialImages.single("image"),
  testimonialController.create
);

// Update testimonial (image upload optional)
router.put(
  "/:id",
  protect,
  restrict("admin", "editor"),
  uploadTestimonialImages.single("image"),
  testimonialController.update
);

// Delete testimonial
router.delete("/:id", protect, restrict("admin"), testimonialController.remove);

module.exports = router;
