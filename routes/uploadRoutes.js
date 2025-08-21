const router = require("express").Router();
const { uploadMisc } = require("../middleware/upload");

router.post("/", uploadMisc.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
  return res.json({ success: true, path: req.file.path.replace(/.*uploads/, "uploads") });
});

module.exports = router;
