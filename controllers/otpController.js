const Otp = require("../models/Otp");
const User = require("../models/User"); // your user model
const { sendMail } = require("../utils/mailer"); // implement your mail util
const RESP = require("../utils/response");

// Helper to generate OTP
const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

exports.sendOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    await sendMail({
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}`,
    });
    res.json({ success: true, message: "OTP sent" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return RESP.bad(res, "Email and OTP are required", 400);

    const record = await Otp.findOne({ email, otp, verified: false });
    if (!record) return RESP.bad(res, "Invalid OTP", 400);
    if (record.expiresAt < new Date()) return RESP.bad(res, "OTP expired", 400);

    // Mark OTP as verified
    record.verified = true;
    await record.save();

    return RESP.ok(res, {}, "OTP verified successfully");
  } catch (e) {
    console.error(e);
    return RESP.bad(res, e.message || e, 500);
  }
};

exports.registerUser = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name)
      return RESP.bad(res, "All fields are required", 400);

    // Check if OTP was verified
    const otpRecord = await Otp.findOne({ email, verified: true });
    if (!otpRecord) return RESP.bad(res, "OTP not verified", 400);

    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) return RESP.bad(res, "User already exists", 400);

    // Create user
    const user = await User.create({ email, password, name });
    return RESP.created(res, user, "User registered successfully");
  } catch (e) {
    console.error(e);
    return RESP.bad(res, e.message || e, 500);
  }
};
