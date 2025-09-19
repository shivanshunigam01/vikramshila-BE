import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ok, bad } from "../utils/response.js";
import Otp from "../models/Otp.js";
import twilio from "twilio";
import dotenv from "dotenv";
import Customer from "../models/Customer.js";
import bcrypt from "bcryptjs";
import Dse from "../models/Dse.js";

dotenv.config();

const client = new twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

function normalizePhoneIndia(input) {
  const digits = String(input || "").replace(/\D/g, "");
  const last10 = digits.slice(-10);
  if (last10.length !== 10) return { ok: false };
  return { ok: true, e164: `+91${last10}` }; // store/send E.164 consistently
}

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

// export const sendOtp = async (req, res) => {
//   const { phone } = req.body;

//   if (!phone)
//     return res.status(400).json({ message: "Phone number is required" });

//   const otp = generateOTP();

//   await Otp.deleteMany({ phone });

//   try {
//     const newOtp = new Otp({ phone, otp });
//     await newOtp.save();

//     try {
//       await client.messages.create({
//         body: `Your OTP for registering with VIKRAMSHILA AUTOMOBILES is: ${otp}. Do not share this code with anyone.`,
//         from: process.env.TWILIO_PHONE_NUMBER,
//         to: phone,
//       });
//     } catch (err) {
//       console.error("Twilio Error:", err.message, err.code, err.moreInfo);
//       throw err;
//     }
//     return res.status(200).json({ message: "OTP sent successfully" });
//   } catch (error) {
//     return res
//       .status(500)
//       .json({ message: "Failed to send OTP", error: error.message });
//   }
// };

// 🔹 Register Customer
export const registerCustomer = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const newCustomer = new Customer({
      name,
      email,
      phone,
      password,
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

export const sendOtp = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return bad(res, "Phone number is required", 400);

  const norm = normalizePhoneIndia(phone);
  if (!norm.ok) return bad(res, "Invalid phone number", 400);

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expireAt = new Date(
    Date.now() + (Number(process.env.OTP_TTL_MS) || 5 * 60 * 1000)
  ); // 5 min

  try {
    await Otp.deleteMany({ phone: norm.e164 });
    await Otp.create({ phone: norm.e164, otp, expireAt, attempts: 0 }); // <-- expireAt REQUIRED

    // Twilio prefers E.164
    await client.messages.create({
      body: `Your OTP for VIKRAMSHILA AUTOMOBILES is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: norm.e164,
    });

    return ok(res, { sent: true }, "OTP sent successfully");
  } catch (error) {
    console.error("sendOtp error:", error);
    return bad(res, error.message || "Failed to send OTP", 500);
  }
};

export const customerlogin = async (req, res) => {
  try {
    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to send OTP", error: error.message });
  }
};

// ✅ OTP Login (verify OTP; create/update customer; issue JWT)
export const otpLogin = async (req, res) => {
  try {
    const { phone, otp, name, email } = req.body;
    if (!phone || !otp) return bad(res, "Phone and OTP are required", 400);

    const norm = normalizePhoneIndia(phone);
    if (!norm.ok) return bad(res, "Invalid phone number", 400);

    const doc = await Otp.findOne({ phone: norm.e164 });
    if (!doc) return bad(res, "Invalid or expired OTP", 400);
    if (doc.expireAt && doc.expireAt < new Date()) {
      await Otp.deleteMany({ phone: norm.e164 });
      return bad(res, "OTP expired. Please request a new one.", 400);
    }
    if (doc.otp !== otp) {
      doc.attempts = (doc.attempts || 0) + 1;
      await doc.save();
      return bad(res, "Invalid OTP", 400);
    }

    // consume OTP
    await Otp.deleteMany({ phone: norm.e164 });

    // find / create customer (store same normalized phone)
    let customer = await Customer.findOne({ phone: norm.e164 });
    if (!customer) {
      if (!name) return bad(res, "Name is required for first-time login", 400);
      customer = await Customer.create({
        name: String(name).trim(),
        email: email ? String(email).trim() : null,
        phone: norm.e164,
      });
    } else {
      let updated = false;
      if (!customer.name && name) {
        customer.name = String(name).trim();
        updated = true;
      }
      if (!customer.email && email) {
        customer.email = String(email).trim();
        updated = true;
      }
      if (updated) await customer.save();
    }

    const token = jwt.sign({ id: customer._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return ok(
      res,
      {
        token,
        user: {
          id: customer._id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
        },
      },
      "Login successful"
    );
  } catch (error) {
    console.error("otpLogin error:", error);
    return bad(res, error.message, 500);
  }
};

export const checkCustomer = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return bad(res, "Phone is required", 400);

    const norm = normalizePhoneIndia(phone);
    if (!norm.ok) return bad(res, "Invalid phone number", 400);

    const exists = !!(await Customer.findOne({ phone: norm.e164 }));
    return ok(res, { exists });
  } catch (error) {
    return bad(res, error.message, 500);
  }
};

const needsBranch = (role) =>
  ["dsm", "branch_admin", "dse"].includes(String(role));

export const createStaffUser = async (req, res) => {
  try {
    let { username, password, name, email, role, branch } = req.body || {};

    // --- Basic validation ---
    if (!username || !password || !name || !email || !role) {
      return bad(
        res,
        "username, password, name, email and role are required",
        400
      );
    }

    username = String(username).trim().toLowerCase();
    email = String(email).trim().toLowerCase();
    name = String(name).trim();
    role = String(role).trim();

    if (String(password).length < 6) {
      return bad(res, "Password must be at least 6 characters", 400);
    }
    if (needsBranch(role)) {
      if (!branch || !String(branch).trim()) {
        return bad(res, "Branch is required for DSM / Branch Admin / DSE", 400);
      }
      branch = String(branch).trim();
    } else {
      branch = null; // ignore for admin
    }

    // --- Uniqueness checks ---
    const existsUsername = await User.findOne({ username });
    if (existsUsername) return bad(res, "Username already exists", 409);

    const existsEmail = await User.findOne({ email });
    if (existsEmail) return bad(res, "Email already exists", 409);

    // --- Create user ---
    const user = await User.create({
      username,
      password, // hashed by pre-save hook
      name,
      email,
      role,
      branch,
    });

    return ok(
      res,
      {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
        createdAt: user.createdAt,
      },
      "User created successfully"
    );
  } catch (err) {
    // handle duplicate key error gracefully
    if (err?.code === 11000) {
      const key = Object.keys(err.keyPattern || {})[0] || "field";
      return bad(res, `${key} must be unique`, 409);
    }
    return bad(res, err?.message || "Failed to create user", 500);
  }
};

export const getAllUsers = async (_req, res) => {
  try {
    const users = await User.find({})
      .select(
        "_id username name email role branch isActive createdAt updatedAt"
      ) // no password
      .sort("-createdAt")
      .lean();

    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return bad(res, "User id required", 400);

    // find first to validate + get role
    const user = await User.findById(id).select("role");
    if (!user) return bad(res, "User not found", 404);

    // prevent deleting the last admin
    if (user.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return bad(res, "Cannot delete the last admin user", 400);
      }
    }

    await User.findByIdAndDelete(id);
    return ok(res, { id }, "User deleted");
  } catch (err) {
    return bad(res, err?.message || "Failed to delete user", 500);
  }
};
// --- Register DSE ---
export const registerDse = async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) {
      return bad(res, "Missing fields", 400);
    }

    const exists = await Dse.findOne({ phone });
    if (exists) return bad(res, "Phone already registered", 400);

    const dse = new Dse({ name, phone });
    await dse.setPassword(password);
    await dse.save();

    const token = jwt.sign(
      { id: dse._id, name: dse.name, role: dse.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "180d" }
    );

    return ok(
      res,
      {
        user: { id: dse._id, name: dse.name, phone: dse.phone, role: dse.role },
        token,
      },
      "DSE registered successfully"
    );
  } catch (err) {
    console.error("registerDse error:", err);
    return bad(res, "Server error", 500);
  }
};

// --- Login DSE ---
export const loginDse = async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password)
      return bad(res, "Phone and password required", 400);

    const dse = await Dse.findOne({ phone });
    if (!dse) return bad(res, "Invalid phone/password", 400);

    const valid = await dse.validatePassword(password);
    if (!valid) return bad(res, "Invalid phone/password", 400);

    const token = jwt.sign(
      { id: dse._id, name: dse.name, role: dse.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "180d" }
    );

    return ok(
      res,
      {
        user: { id: dse._id, name: dse.name, phone: dse.phone, role: dse.role },
        token,
      },
      "DSE login successful"
    );
  } catch (err) {
    console.error("loginDse error:", err);
    return bad(res, "Server error", 500);
  }
};
