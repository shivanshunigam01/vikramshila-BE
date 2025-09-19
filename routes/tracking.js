import express from "express";
import auth from "../middleware/authenticate.js";
import LocationPoint from "../models/LocationPoint.js";

const router = express.Router();

// Simple ping
router.get("/ping", (_, res) => res.json({ ok: true }));

// Save multiple locations
router.post("/locations", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Resolve client IP robustly
    const ip =
      (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
      req.ip ||
      req.connection?.remoteAddress ||
      null;

    const ua = req.headers["user-agent"] || null;

    const { points } = req.body;
    if (!Array.isArray(points) || points.length === 0) {
      return res.status(400).json({ message: "No points" });
    }

    const docs = points.map((p) => ({
      user: userId,
      ts: new Date(p.ts),
      lat: p.lat,
      lon: p.lon,
      acc: p.acc,
      speed: p.speed,
      heading: p.heading,
      battery: p.battery,
      provider: p.provider,
      ip, // <-- store resolved IP
      ua, // <-- store user-agent
    }));

    await LocationPoint.insertMany(docs, { ordered: false });
    res.json({ saved: docs.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
// Query user history
router.get("/user/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;
    const q = { user: id };
    if (from || to) q.ts = {};
    if (from) q.ts.$gte = new Date(from);
    if (to) q.ts.$lte = new Date(to);

    const points = await LocationPoint.find(q).sort({ ts: 1 }).limit(5000);
    res.json(points);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
