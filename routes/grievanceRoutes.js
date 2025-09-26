// routes/grievanceRoutes.js
const express = require("express");
const router = express.Router();

const grievanceController = require("../controllers/grievanceController");

router.post("/create", grievanceController.create);
router.get("/list", grievanceController.list);

router.patch("/in-progress/:id", grievanceController.markInProgress); // NEW
router.patch("/resolve/:id", grievanceController.markResolved);
router.delete("/remove/:id", grievanceController.remove);

module.exports = router;
