const router = require("express").Router();
const ctrl = require("../controllers/serviceController");
const { protect, restrict } = require("../middleware/auth");
const { uploadServiceIcons } = require("../middleware/upload");

router.get("/", ctrl.list);
router.get("/:id", ctrl.get);
router.post("/", protect, restrict("admin", "editor"), uploadServiceIcons.single("icon"), ctrl.create);
router.put("/:id", protect, restrict("admin", "editor"), uploadServiceIcons.single("icon"), ctrl.update);
router.delete("/:id", protect, restrict("admin"), ctrl.remove);

module.exports = router;
