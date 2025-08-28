const router = require("express").Router();
const {
  sendOtp,
  verifyOtp,
  registerUser,
} = require("../controllers/otpController");

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/register", registerUser);

module.exports = router;
