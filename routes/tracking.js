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

/**
 * Get latest location for a specific DSE by id
 * GET /api/tracking/latest/:id
 */
router.get("/latest/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const point = await LocationPoint.findOne({ user: id })
      .sort({ ts: -1 })
      .lean();

    if (!point) return res.status(404).json({ message: "No location found" });
    res.json(point);
  } catch (err) {
    console.error("latest/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * Get latest location for all DSEs (one point per user)
 * GET /api/tracking/latest-all
 * Optional: ?activeWithinMinutes=60 to filter out stale devices
 */
router.get("/latest-all", auth, async (req, res) => {
  try {
    const activeWithinMinutes = Number(req.query.activeWithinMinutes || 0);
    const recentSince = activeWithinMinutes
      ? new Date(Date.now() - activeWithinMinutes * 60 * 1000)
      : null;

    // Aggregate: sort newest first, then group by user and keep first doc
    const pipeline = [
      ...(recentSince ? [{ $match: { ts: { $gte: recentSince } } }] : []),
      { $sort: { user: 1, ts: -1 } },
      {
        $group: {
          _id: "$user",
          point: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: { newRoot: "$point" },
      },
      // optional projection to keep response lightweight
      {
        $project: {
          _id: 1,
          user: 1,
          ts: 1,
          lat: 1,
          lon: 1,
          acc: 1,
          speed: 1,
          heading: 1,
          battery: 1,
          provider: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ];

    const points = await LocationPoint.aggregate(pipeline);
    res.json(points);
  } catch (err) {
    console.error("latest-all error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
export default router;
