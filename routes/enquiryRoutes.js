const router = require("express").Router();
const ctrl = require("../controllers/enquiryController");
const { protect, restrict } = require("../middleware/auth");

router.get("/", protect, restrict("admin", "editor"), ctrl.list);
router.post("/", ctrl.create); // public submit
router.patch("/:id/contacted", protect, restrict("admin", "editor"), ctrl.markContacted);
router.delete("/:id", protect, restrict("admin"), ctrl.remove);

module.exports = router;
