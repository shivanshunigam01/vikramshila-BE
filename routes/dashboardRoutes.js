const router = require("express").Router();
const { stats } = require("../controllers/dashboardController");
const { protect } = require("../middleware/auth");
router.get("/stats", stats);
module.exports = router;
