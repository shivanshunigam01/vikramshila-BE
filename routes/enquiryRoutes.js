const router = require("express").Router();
const ctrl = require("../controllers/enquiryController");
const { protect, restrict } = require("../middleware/auth");
const {
  assignEnquiry,
  dseUpdateEnquiry,
  listAssignedToMeEnquiries,
} = require("../controllers/enquiryController");

router.get("/list", protect, restrict("admin", "editor"), ctrl.list);
router.post("/", ctrl.create); // public submit
router.patch(
  "/:id/contacted",
  protect,
  restrict("admin", "editor"),
  ctrl.markContacted
);
router.delete("/:id", protect, restrict("admin"), ctrl.remove);

router.post("/assign", protect, assignEnquiry);

// Enquiries assigned to me
router.get("/assigned-to-me", protect, listAssignedToMeEnquiries);

// DSE updates enquiry (status/comments, etc.)
router.patch("/:id/dse-update", protect, dseUpdateEnquiry);

module.exports = router;
