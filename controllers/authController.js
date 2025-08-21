const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { ok, bad } = require("../utils/response");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// Register
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Just pass plain password -> model will hash
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

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) return bad(res, "Invalid credentials", 401);

    // Compare password
    const match = await user.comparePassword(password);
    if (!match) return bad(res, "Invalid credentials", 401);

    // Sign token
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
