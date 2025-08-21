const router = require("express").Router();
const ctrl = require("../controllers/launchController");
const { protect, restrict } = require("../middleware/auth");
const { uploadLaunchMedia } = require("../middleware/upload");

router.get("/", ctrl.list);
router.get("/:id", ctrl.get);
router.post("/", protect, restrict("admin", "editor"), uploadLaunchMedia.array("mediaFiles", 10), ctrl.create);
router.put("/:id", protect, restrict("admin", "editor"), uploadLaunchMedia.array("mediaFiles", 10), ctrl.update);
router.delete("/:id", protect, restrict("admin"), ctrl.remove);

module.exports = router;
