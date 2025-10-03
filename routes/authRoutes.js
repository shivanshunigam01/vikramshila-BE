// routes/auth.js  (CJS)
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
  deleteUser,
  loginDse,
  registerDse,
  getDseList,
  createDseVisit,
} = require("../controllers/authController");

// ❌ Remove this — it can break if your model is ESM and it's unused anyway
// const Dse = require("../models/Dse");

const {
  uploadDsePhoto,
  uploadClientVisitPhoto,
} = require("../middleware/upload.js");

// Admin / staff
router.post("/login", login);
router.post("/register", registerUser); // admin register

router.post("/verify-otp", verifyOtp);
router.post("/register-customer", registerCustomer);
router.post("/login-customer", loginUser);
router.post("/check-customer", checkCustomer);
router.post("/send-otp", sendOtp);
router.post("/otp-login", otpLogin);
router.post("/users", createStaffUser);
router.get("/getAllUsers", getAllUsers);
router.delete("/users/:id", deleteUser);

// 🔹 DSE routes (dedicated paths; no collisions)
router.post("/register-dse", uploadDsePhoto, registerDse);
router.post("/login-dse", loginDse);
router.get("/get-dse", getDseList);
// Client visit (with photo + gps)
router.post("/dse/visit", uploadClientVisitPhoto, createDseVisit);

module.exports = router;
