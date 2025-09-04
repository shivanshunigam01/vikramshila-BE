// routes/grievanceRoutes.js
const express = require("express");
const router = express.Router();

const grievanceController = require("../controllers/grievanceController");

// Public route for creating grievance/enquiry
router.post("/create", grievanceController.create);

// Admin route for listing grievances
router.get("/list", grievanceController.list);

// Optional: mark resolved and remove routes
router.patch("/resolve/:id", grievanceController.markResolved);
router.delete("/remove/:id", grievanceController.remove);

module.exports = router;
