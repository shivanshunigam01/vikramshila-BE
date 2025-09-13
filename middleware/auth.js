const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  try {
    let token = null;

    // Authorization: Bearer <token>
    const auth = req.headers.authorization || "";
    if (auth.startsWith("Bearer ")) token = auth.split(" ")[1];

    // Optionally accept x-auth-token too
    if (!token && req.headers["x-auth-token"])
      token = req.headers["x-auth-token"];

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Handle multiple possible payload shapes
    const userId =
      decoded?.id || decoded?._id || decoded?.userId || decoded?.sub || null;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid token payload" });
    }

    const user = await User.findById(userId).select("_id name email role");
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    // Attach a minimal, consistent shape
    req.user = {
      _id: String(user._id),
      name: user.name || "",
      email: (user.email || "").toLowerCase(),
      role: user.role || "user",
    };

    next();
  } catch (e) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid/expired token" });
  }
};

exports.restrict =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    next();
  };
