import jwt from "jsonwebtoken";
import Dse from "../models/Dse.js";

export const protectDSE = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "DSE token missing" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const dse = await Dse.findById(decoded.id);
    if (!dse) {
      return res.status(404).json({ success: false, message: "DSE not found" });
    }

    req.user = {
      id: dse._id.toString(),
      name: dse.name,
      phone: dse.phone,
      role: dse.role,
    };

    next();
  } catch (err) {
    console.log("protectDSE error:", err);
    return res.status(401).json({
      success: false,
      message: "DSE authentication failed. Login again.",
    });
  }
};
