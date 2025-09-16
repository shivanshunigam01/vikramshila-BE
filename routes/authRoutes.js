const router = require("express").Router();
const {
  login,
  registerUser,
  sendOtp,
  verifyOtp,
  registerCustomer,
  loginUser,
  checkCustomer,
  otpLogin,
  createStaffUser,
  getAllUsers,
} = require("../controllers/authController");
router.post("/login", login);
// Register new admin
router.post("/register", registerUser);

// router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/register-customer", registerCustomer);
router.post("/login-customer", loginUser);

router.post("/check-customer", checkCustomer); // { phone } -> { exists }
router.post("/send-otp", sendOtp); // { phone }
router.post("/otp-login", otpLogin); // { phone, otp, [name], [email] }

router.post(
  "/users",

  createStaffUser
);

// If you want it protected, use: router.get("/", protect, getAllUsers);
router.get("/", getAllUsers);
module.exports = router;
