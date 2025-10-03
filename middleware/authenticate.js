// middleware/authenticate.js
import jwt from "jsonwebtoken";
import Dse from "../models/Dse.js";

export default async function auth(req, res, next) {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      console.error("❌ No token in request headers");
      return res.status(401).json({ message: "Unauthorized: No token" });
    }

    // decode
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // load DSE user
    const user = await Dse.findById(decoded.id);
    if (!user) {
      console.error("❌ Token valid but no user found for id:", decoded.id);
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    // attach to request
    req.user = { id: user._id, name: user.name, phone: user.phone };

    console.log("✅ Authenticated user in middleware:", req.user);
    next();
  } catch (err) {
    console.error("❌ Auth middleware error:", err.message);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
}
