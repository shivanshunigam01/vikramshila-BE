// middleware/protect.js (CJS)
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
let User = require("../models/User");
User = User?.default || User;

const getToken = (req) => {
  const auth = (
    req.headers.authorization ||
    req.headers.Authorization ||
    ""
  ).trim();
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const x = (req.headers["x-auth-token"] || "").toString().trim();
  if (x) return x;
  const cookieTok =
    req.cookies?.token || req.cookies?.access_token || req.cookies?.jwt;
  if (cookieTok) return String(cookieTok).trim();
  return null;
};

const extractUserId = (decoded) => {
  if (!decoded) return null;
  if (typeof decoded === "string") return decoded;
  let id =
    decoded.id ||
    decoded._id ||
    decoded.userId ||
    decoded.sub ||
    (decoded.user && (decoded.user.id || decoded.user._id)) ||
    (decoded.data &&
      (decoded.data.id ||
        decoded.data._id ||
        decoded.data.userId ||
        decoded.data.sub)) ||
    null;
  if (id && typeof id === "object") id = id._id || id.id || null;
  if (typeof id === "string") id = id.trim();
  return id || null;
};

exports.protect = async (req, res, next) => {
  try {
    const token = getToken(req);
    if (!token)
      return res
        .status(401)
        .json({ success: false, message: "Not authorized" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message:
          err?.name === "TokenExpiredError" ? "Token expired" : "Invalid token",
      });
    }

    console.log("Decoded JWT:", decoded);

    let userId = extractUserId(decoded);
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid token payload" });
    }

    const user = await User.findById(userId).select(
      "_id name email role isActive"
    );
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "User not found" });

    if (user.isActive === false) {
      return res
        .status(403)
        .json({ success: false, message: "User is inactive" });
    }

    req.user = {
      _id: String(user._id),
      name: user.name || "",
      email: (user.email || "").toLowerCase(),
      role: user.role || "user",
    };
    req.token = token;

    next();
  } catch (err) {
    console.error("Protect middleware error:", err);
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
