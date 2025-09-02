const router = require("express").Router();
const {
  login,
  registerUser,
  sendOtp,
  verifyOtp,
  registerCustomer,
  loginUser,
} = require("../controllers/authController");
router.post("/login", login);
// Register new admin
router.post("/register", registerUser);

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/register-customer", registerCustomer);
router.post("/login-customer", loginUser);

module.exports = router;
