import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ok, bad } from "../utils/response.js";
import Otp from "../models/Otp.js";
import twilio from "twilio";
import dotenv from "dotenv";
import Customer from "../models/Customer.js";
import bcrypt from "bcryptjs";

dotenv.config();

const client = new twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// 🔹 Register Admin User
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const newUser = new User({
      name,
      email,
      password,
      role: role || "admin",
    });

    await newUser.save();

    return ok(res, {}, "User registered successfully");
  } catch (error) {
    return bad(res, error.message, 500);
  }
};

// 🔹 Login Admin
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return bad(res, "Invalid credentials", 401);

    const match = await user.comparePassword(password);
    if (!match) return bad(res, "Invalid credentials", 401);

    const token = signToken(user._id);

    return ok(
      res,
      {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      "Logged in"
    );
  } catch (e) {
    return bad(res, e.message, 500);
  }
};

// 🔹 Send OTP
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const sendOtp = async (req, res) => {
  const { phone } = req.body;

  if (!phone)
    return res.status(400).json({ message: "Phone number is required" });

  const otp = generateOTP();

  await Otp.deleteMany({ phone });

  try {
    const newOtp = new Otp({ phone, otp });
    await newOtp.save();

    try {
      await client.messages.create({
        body: `Your OTP for registering with VIKRAMSHILA AUTOMOBILES is: ${otp}. Do not share this code with anyone.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
    } catch (err) {
      console.error("Twilio Error:", err.message, err.code, err.moreInfo);
      throw err;
    }
    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to send OTP", error: error.message });
  }
};

// 🔹 Register Customer
export const registerCustomer = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Directly create user without checking existing email
    const newCustomer = new Customer({
      name,
      email,
      phone,
      password, // plain password
    });

    await newCustomer.save();

    return res
      .status(201)
      .json({ success: true, message: "User registered successfully" });
  } catch (error) {
    console.error("Registration error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// 🔹 Verify OTP
export const verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;

  try {
    const existingOtp = await Otp.findOne({ phone, otp });

    if (!existingOtp) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    await Otp.deleteMany({ phone });

    return res.status(200).json({
      message: "OTP verified successfully",
      phone,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({
      message: "Server error while verifying OTP",
      error: error.message,
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Validation
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    // ✅ Find user by email
    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // ✅ Use the model's comparePassword method
    const isMatch = await customer.comparePassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // ✅ Generate JWT
    const token = signToken(customer._id);

    // ✅ Store token in cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // ✅ Response
    return res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: customer._id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
