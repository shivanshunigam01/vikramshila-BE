const router = require("express").Router();
const ctrl = require("../controllers/testimonialController");
const { protect, restrict } = require("../middleware/auth");
const { uploadTestimonialImages } = require("../middleware/upload");

router.get("/", ctrl.list);
router.get("/:id", ctrl.get);
router.post("/", protect, restrict("admin", "editor"), uploadTestimonialImages.single("image"), ctrl.create);
router.put("/:id", protect, restrict("admin", "editor"), uploadTestimonialImages.single("image"), ctrl.update);
router.delete("/:id", protect, restrict("admin"), ctrl.remove);

module.exports = router;
