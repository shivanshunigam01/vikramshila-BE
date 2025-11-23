// middleware/authUser.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export default async function authUser(req, res, next) {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token" });
    }

    // decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // find user in USERS collection (NOT DSE)
    const user = await User.findById(decoded.id);
    if (!user) {
      console.error("❌ User not found for id:", decoded.id);
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    // attach user to request
    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };

    console.log("✅ Authenticated USER:", req.user);

    next();
  } catch (err) {
    console.error("❌ authUser error:", err.message);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
}
