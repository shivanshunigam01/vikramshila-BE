const router = require("express").Router();
const { login, registerUser } = require("../controllers/authController");
router.post("/login", login);
// Register new admin
router.post("/register", registerUser);
module.exports = router;
    