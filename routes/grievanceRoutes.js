const express = require("express");
const router = express.Router();

const grievanceController = require("../controllers/grievanceController");

// Create a grievance
router.post("/create", grievanceController.create);

// List grievances
router.get("/list", grievanceController.list);

// Generic update (status + message)
router.patch("/update/:id", grievanceController.updateStatus);

// Delete grievance
router.delete("/remove/:id", grievanceController.remove);

module.exports = router;
