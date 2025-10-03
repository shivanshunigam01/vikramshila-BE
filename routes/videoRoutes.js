const express = require("express");
const router = express.Router();
const videoController = require("../controllers/videoController");

router.post("/create", videoController.createVideo);
router.get("/list", videoController.listVideos);
router.get("/:id", videoController.getVideoById);
router.patch("/update/:id", videoController.updateVideo);
router.delete("/remove/:id", videoController.deleteVideo);

module.exports = router;
