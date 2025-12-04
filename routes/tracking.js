// routes/tracking.js
import express from "express";
import auth from "../middleware/authenticate.js";
import Dse from "../models/Dse.js";
import LocationPoint from "../models/LocationPoint.js";
import { Parser as Json2Csv } from "json2csv";
import ClientVisit from "../models/ClientVisit.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

/* ============================================================
   Helpers
============================================================ */

import fetch from "node-fetch";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
console.log(GOOGLE_API_KEY, "GOOGLE_API_KEY in tracking.js");
async function reverseGeocode(lat, lon) {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.results?.length) throw new Error("No address found");

    const best = data.results[0]; // Most accurate
    const formatted = best.formatted_address;

    // Extract more precise landmark or building name
    const landmark =
      best.address_components?.find(
        (c) =>
          c.types.includes("premise") ||
          c.types.includes("point_of_interest") ||
          c.types.includes("establishment")
      )?.long_name || formatted.split(",")[0];

    return {
      display: formatted,
      landmark, // ✅ Apartment, shop, or nearby building
      city:
        best.address_components?.find((c) => c.types.includes("locality"))
          ?.long_name || null,
      state:
        best.address_components?.find((c) =>
          c.types.includes("administrative_area_level_1")
        )?.long_name || null,
      country:
        best.address_components?.find((c) => c.types.includes("country"))
          ?.long_name || null,
    };
  } catch (err) {
    console.error("Reverse Geocode Error:", err.message);
    return null;
  }
}

const R_EARTH_KM = 6371; // km

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH_KM * Math.asin(Math.sqrt(a));
}

function summarizeDay(points, opts = {}) {
  const maxAcc = opts.maxAcc ?? 500; // meters
  const maxJumpKm = opts.maxJumpKm ?? 10; // ignore absurd jumps between consecutive pings

  let distanceKm = 0;
  let prev = null;
  let pings = 0;

  for (const p of points) {
    if (maxAcc && typeof p.acc === "number" && p.acc > maxAcc) continue;
    if (!prev) {
      prev = p;
      pings++;
      continue;
    }
    const d = haversineKm(prev.lat, prev.lon, p.lat, p.lon);
    if (d <= maxJumpKm) distanceKm += d;
    prev = p;
    pings++;
  }

  const first = points[0]?.ts || null;
  const last = points[points.length - 1]?.ts || null;
  return { first, last, pings, distanceKm: Number(distanceKm.toFixed(2)) };
}

function ymdUTC(d) {
  return new Date(d).toISOString().slice(0, 10); // YYYY-MM-DD
}
function startOfDayUTC(dateStr) {
  return new Date(`${dateStr}T00:00:00.000Z`);
}
function endOfDayUTC(dateStr) {
  return new Date(`${dateStr}T23:59:59.999Z`);
}
function normDate(v, fallback) {
  const d = v ? new Date(v) : null;
  return isNaN(d?.getTime() ?? NaN) ? fallback : d;
}
// router.post("/locations", async (req, res) => {
//   console.log("Received:", req.body.points?.length, req.body.points?.[0]);
//   res.json({ ok: true });
// });

function byTsAsc(a, b) {
  return new Date(a.ts).getTime() - new Date(b.ts).getTime();
}

/* ============================================================
   Basic health
============================================================ */
router.get("/ping", (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

/* ============================================================
   Ingestion: save multiple locations
   Body: { points: [{ ts, lat, lon, acc?, speed?, heading?, battery?, provider? }, ...] }
============================================================ */
// ============================================================
// Ingestion: save multiple locations
// Body: { points: [{ ts, lat, lon, acc?, speed?, heading?, battery?, provider? }, ...] }
// ============================================================
// adjust path if needed

// routes/tracking.js
// Save locations to DB
router.post("/locations", auth, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      console.error("❌ No req.user in /locations");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;
    const { points } = req.body || {};

    console.log("📥 Received request from user:", req.user);
    console.log("📥 Raw points:", points);

    if (!Array.isArray(points) || points.length === 0) {
      console.error("❌ No points array");
      return res.status(400).json({ message: "No points" });
    }

    // prepare docs
    const docs = points
      .map((p) => {
        const lat = Number(p.lat);
        const lon = Number(p.lon);

        // ✅ HARD BLOCK ZERO + NON-INDIA
        if (
          !lat ||
          !lon ||
          lat === 0 ||
          lon === 0 ||
          lat < 6 ||
          lat > 37 ||
          lon < 68 ||
          lon > 97
        ) {
          console.warn("⛔ Dropped invalid location:", lat, lon);
          return null;
        }

        return {
          user: userId,
          ts: new Date(Number(p.ts)),
          lat,
          lon,
          acc: p.acc != null ? Number(p.acc) : undefined,
          speed: p.speed != null ? Number(p.speed) : undefined,
          heading: p.heading != null ? Number(p.heading) : undefined,
          battery: p.battery != null ? Number(p.battery) : undefined,
          provider: p.provider ?? "gps",
        };
      })
      .filter(Boolean);

    // save
    const saved = await LocationPoint.insertMany(docs, { ordered: false });
    console.log(`💾 Mongo saved ${saved.length} points for user=${userId}`);

    res.json({ saved: saved.length });
  } catch (err) {
    console.error("❌ Insert error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ============================================================
   History for a user (raw points)
   GET /user/:id?from=ISO&to=ISO
============================================================ */
router.get("/user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    const q = { user: id };
    if (from || to) {
      q.ts = {};
      if (from) {
        const f = new Date(from);
        if (!isNaN(f.getTime())) q.ts.$gte = f;
      }
      if (to) {
        const t = new Date(to);
        if (!isNaN(t.getTime())) q.ts.$lte = t;
      }
      // if both were invalid, remove ts filter
      if (Object.keys(q.ts).length === 0) delete q.ts;
    }

    const points = await LocationPoint.find(q).sort({ ts: 1 }).limit(5000);
    res.json(points);
  } catch (err) {
    console.error("GET /user/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ============================================================
   Latest for a specific DSE
   GET /latest/:id
============================================================ */
router.get("/latest/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const point = await LocationPoint.findOne({ user: id })
      .sort({ ts: -1 })
      .lean();
    if (!point) return res.status(404).json({ message: "No location found" });
    res.json(point);
  } catch (err) {
    console.error("GET /latest/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ============================================================
   Latest for all (one point per user)
   GET /latest-all?activeWithinMinutes=60
============================================================ */
router.get("/latest-all", async (req, res) => {
  try {
    const activeWithinMinutes = Number(req.query.activeWithinMinutes || 0);
    const recentSince = activeWithinMinutes
      ? new Date(Date.now() - activeWithinMinutes * 60 * 1000)
      : null;

    const pipeline = [
      ...(recentSince ? [{ $match: { ts: { $gte: recentSince } } }] : []),
      { $sort: { user: 1, ts: -1 } },
      {
        $group: {
          _id: "$user",
          point: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$point" } },
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
    console.error("GET /latest-all error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
/* ============================================================
   Mark DSE as offline manually
   POST /api/tracking/offline  { userId }
============================================================ */
router.post("/offline", auth, async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    if (!userId) return res.status(400).json({ message: "Missing userId" });

    // ✅ Fetch last valid location
    const last = await LocationPoint.findOne({
      user: userId,
      lat: { $ne: 0 },
      lon: { $ne: 0 },
    }).sort({ ts: -1 });

    await LocationPoint.create({
      user: userId,
      ts: new Date(),
      lat: last?.lat ?? 0.000001,
      lon: last?.lon ?? 0.000001,
      provider: "manual_offline",
    });

    res.json({ ok: true, message: "User marked offline safely" });
  } catch (err) {
    console.error("POST /offline error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ============================================================
   Latest for all + joined with DSE info (with isOnline + lastSeenAgo)
   GET /api/tracking/latest-all-with-dse?activeWithinMinutes=5
============================================================ */
router.get("/latest-all-with-dse", async (req, res) => {
  try {
    const activeWithinMinutes = Number(req.query.activeWithinMinutes || 5);

    const pipeline = [
      // 1️⃣ Sort by user then latest first
      { $sort: { user: 1, ts: -1 } },

      // 2️⃣ Group ALL location history per DSE
      {
        $group: {
          _id: "$user",
          points: { $push: "$$ROOT" },
        },
      },

      // 3️⃣ Pick FIRST VALID LOCATION (not 0,0)
      {
        $addFields: {
          point: {
            $first: {
              $filter: {
                input: "$points",
                as: "p",
                cond: {
                  $and: [
                    { $ne: ["$$p.lat", 0] },
                    { $ne: ["$$p.lon", 0] },
                    { $gte: ["$$p.lat", 6] }, // ✅ India south
                    { $lte: ["$$p.lat", 37] }, // ✅ India north
                    { $gte: ["$$p.lon", 68] }, // ✅ India west
                    { $lte: ["$$p.lon", 97] }, // ✅ India east
                  ],
                },
              },
            },
          },
        },
      },

      // 4️⃣ Flatten structure
      { $replaceRoot: { newRoot: "$point" } },

      // 5️⃣ Join DSE Master
      {
        $lookup: {
          from: "dses",
          localField: "user",
          foreignField: "_id",
          as: "dse",
        },
      },
      { $unwind: "$dse" },

      // 6️⃣ Final response projection
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
          provider: 1,
          dseName: "$dse.name",
          dsePhone: "$dse.phone",
          dsePhotoUrl: "$dse.photoUrl",
        },
      },
    ];

    const rows = await LocationPoint.aggregate(pipeline);

    const enriched = rows.map((r) => {
      const diffMin = (Date.now() - new Date(r.ts).getTime()) / 60000;

      const isZeroLocation = Number(r.lat) === 0 || Number(r.lon) === 0;
      const isOfflineManual = r.provider === "manual_offline";

      const isOnline =
        !isZeroLocation && !isOfflineManual && diffMin <= activeWithinMinutes;

      const lastSeenAgo = isZeroLocation
        ? "Offline – showing last valid India location"
        : isOfflineManual
        ? "Stopped manually"
        : diffMin < 1
        ? "Just now"
        : diffMin < 60
        ? `${Math.floor(diffMin)} min ago`
        : `${Math.floor(diffMin / 60)} hr ago`;

      return {
        ...r,
        isOnline,
        isZeroLocation,
        lastSeenAgo,
      };
    });

    res.json({
      activeWithinMinutes,
      total: rows.length,
      online: enriched.filter((r) => r.isOnline).length,
      rows: enriched,
    });
  } catch (err) {
    console.error("GET /latest-all-with-dse error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ============================================================
   CSV: latest-all-with-dse (respects activeWithinMinutes)
   GET /export/latest-all?activeWithinMinutes=60
============================================================ */
router.get("/export/latest-all", async (req, res) => {
  try {
    // reuse the pipeline via internal call
    req.url = "/latest-all-with-dse";
    const rows = await new Promise((resolve, reject) => {
      router.handle(
        req,
        { json: resolve, status: () => ({ json: reject }) },
        () => {}
      );
    });

    const data = rows.map((r) => ({
      Name: r.dseName,
      Phone: r.dsePhone,
      Latitude: r.lat,
      Longitude: r.lon,
      Accuracy_m: r.acc ?? "",
      Speed: r.speed ?? "",
      Timestamp: r.ts,
      Provider: r.provider ?? "",
    }));

    const csv = new Json2Csv().parse(data);
    res.header("Content-Type", "text/csv");
    res.attachment("dse-latest.csv");
    res.send(csv);
  } catch (err) {
    console.error("GET /export/latest-all error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ============================================================
   CSV: raw points for one DSE
   GET /export/dse/:id.csv?from=ISO&to=ISO&limit=5000
============================================================ */
router.get("/export/dse/:id.csv", async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Number(req.query.limit || 5000);
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    const q = { user: id };
    if (from || to) q.ts = {};
    if (from) q.ts.$gte = from;
    if (to) q.ts.$lte = to;

    const pts = await LocationPoint.find(q).sort({ ts: 1 }).limit(limit).lean();
    const csv = new Json2Csv().parse(
      pts.map((p) => ({
        Timestamp: p.ts,
        Latitude: p.lat,
        Longitude: p.lon,
        Accuracy_m: p.acc ?? "",
        Speed: p.speed ?? "",
        Heading: p.heading ?? "",
        Provider: p.provider ?? "",
      }))
    );
    res.header("Content-Type", "text/csv");
    res.attachment(`dse-${id}.csv`);
    res.send(csv);
  } catch (err) {
    console.error("GET /export/dse/:id.csv error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ============================================================
   REPORTS: Attendance (per-day)
   GET /report/attendance?date=YYYY-MM-DD&presentMinPings=1&maxAcc=500
============================================================ */
router.get("/report/attendance", async (req, res) => {
  try {
    const date = (req.query.date || ymdUTC(new Date())).toString();
    const presentMinPings = Number(req.query.presentMinPings || 1);
    const maxAcc = Number(req.query.maxAcc || 500);

    const from = startOfDayUTC(date);
    const to = endOfDayUTC(date);

    const dses = await Dse.find({}).lean();
    const out = [];

    // (simple loop to keep memory small)
    for (const dse of dses) {
      const pts = await LocationPoint.find({
        user: dse._id,
        ts: { $gte: from, $lte: to },
      })
        .sort({ ts: 1 })
        .lean();

      const summary = summarizeDay(pts, { maxAcc });
      out.push({
        dseId: dse._id,
        name: dse.name,
        phone: dse.phone,
        present: (summary.pings || 0) >= presentMinPings,
        first: summary.first,
        last: summary.last,
        pings: summary.pings,
        distanceKm: summary.distanceKm,
      });
    }

    res.json({ date, rows: out });
  } catch (e) {
    console.error("GET /report/attendance error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

/* CSV: Attendance  GET /report/attendance.csv?date=YYYY-MM-DD */
router.get("/report/attendance.csv", async (req, res) => {
  try {
    // call the JSON endpoint internally to reuse its logic
    const json = await new Promise((resolve, reject) => {
      router.handle(
        { ...req, method: "GET", url: "/report/attendance" },
        { json: resolve, status: () => ({ json: reject }) },
        () => {}
      );
    });

    const rows = json.rows.map((r) => ({
      Date: json.date,
      Name: r.name,
      Phone: r.phone,
      Present: r.present ? "Yes" : "No",
      FirstPing: r.first || "",
      LastPing: r.last || "",
      Pings: r.pings,
      DistanceKm: r.distanceKm,
    }));

    const csv = new Json2Csv().parse(rows);
    res.header("Content-Type", "text/csv");
    res.attachment(`attendance-${json.date}.csv`);
    res.send(csv);
  } catch (e) {
    console.error("GET /report/attendance.csv error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

/* ============================================================
   REPORTS: Summary for ALL DSEs (bucketed by day|week|month)
   GET /report/summary?from=ISO&to=ISO&bucket=day|week|month&maxAcc=500
============================================================ */
router.get("/report/summary", async (req, res) => {
  try {
    const from = normDate(req.query.from, new Date(Date.now() - 7 * 864e5));
    const to = normDate(req.query.to, new Date());
    const bucket = (req.query.bucket || "day").toString(); // day|week|month
    const maxAcc = Number(req.query.maxAcc || 500);

    const dses = await Dse.find({}).lean();
    const byDse = [];

    for (const dse of dses) {
      const pts = await LocationPoint.find({
        user: dse._id,
        ts: { $gte: from, $lte: to },
      })
        .sort({ ts: 1 })
        .lean();

      // group by bucket key
      const groups = new Map();
      for (const p of pts) {
        const dt = new Date(p.ts);
        let key = "";
        if (bucket === "month") key = dt.toISOString().slice(0, 7); // YYYY-MM
        else if (bucket === "week") {
          const d = new Date(
            Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate())
          );
          d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
          const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
          const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
          key = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
        } else key = dt.toISOString().slice(0, 10); // day
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(p);
      }

      const buckets = [];
      for (const [key, arr] of groups.entries()) {
        arr.sort(byTsAsc);
        const sum = summarizeDay(arr, { maxAcc });
        buckets.push({ key, ...sum });
      }
      buckets.sort((a, b) => (a.key < b.key ? -1 : 1));

      byDse.push({
        dseId: dse._id,
        name: dse.name,
        phone: dse.phone,
        buckets,
      });
    }

    res.json({
      from: from.toISOString(),
      to: to.toISOString(),
      bucket,
      rows: byDse,
    });
  } catch (e) {
    console.error("GET /report/summary error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

/* One DSE summary: GET /report/summary/:id?from=&to=&bucket= */
router.get("/report/summary/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const from = normDate(req.query.from, new Date(Date.now() - 7 * 864e5));
    const to = normDate(req.query.to, new Date());
    const bucket = (req.query.bucket || "day").toString();
    const maxAcc = Number(req.query.maxAcc || 500);

    const dse = await Dse.findById(id).lean();
    if (!dse) return res.status(404).json({ message: "DSE not found" });

    const pts = await LocationPoint.find({
      user: id,
      ts: { $gte: from, $lte: to },
    })
      .sort({ ts: 1 })
      .lean();

    const groups = new Map();
    for (const p of pts) {
      const dt = new Date(p.ts);
      let key = "";
      if (bucket === "month") key = dt.toISOString().slice(0, 7);
      else if (bucket === "week") {
        const d = new Date(
          Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate())
        );
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
        key = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
      } else key = dt.toISOString().slice(0, 10);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }

    const buckets = [];
    for (const [key, arr] of groups.entries()) {
      arr.sort(byTsAsc);
      const sum = summarizeDay(arr, { maxAcc });
      buckets.push({ key, ...sum });
    }
    buckets.sort((a, b) => (a.key < b.key ? -1 : 1));

    res.json({
      dseId: dse._id,
      name: dse.name,
      phone: dse.phone,
      from: from.toISOString(),
      to: to.toISOString(),
      bucket,
      buckets,
    });
  } catch (e) {
    console.error("GET /report/summary/:id error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

/* CSV: ALL summaries  GET /report/summary.csv?from=&to=&bucket= */
router.get("/report/summary.csv", async (req, res) => {
  try {
    const json = await new Promise((resolve, reject) => {
      router.handle(
        { ...req, method: "GET", url: "/report/summary" },
        { json: resolve, status: () => ({ json: reject }) },
        () => {}
      );
    });

    const flat = [];
    for (const r of json.rows) {
      for (const b of r.buckets) {
        flat.push({
          Name: r.name,
          Phone: r.phone,
          Bucket: json.bucket,
          Key: b.key,
          FirstPing: b.first || "",
          LastPing: b.last || "",
          Pings: b.pings,
          DistanceKm: b.distanceKm,
        });
      }
    }

    const csv = new Json2Csv().parse(flat);
    res.header("Content-Type", "text/csv");
    res.attachment(`summary-${json.bucket}.csv`);
    res.send(csv);
  } catch (e) {
    console.error("GET /report/summary.csv error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

/* CSV: ONE DSE summary  GET /report/summary/:id.csv?from=&to=&bucket= */
router.get("/report/summary/:id.csv", async (req, res) => {
  try {
    const json = await new Promise((resolve, reject) => {
      router.handle(
        { ...req, method: "GET", url: `/report/summary/${req.params.id}` },
        { json: resolve, status: () => ({ json: reject }) },
        () => {}
      );
    });

    const rows = json.buckets.map((b) => ({
      Name: json.name,
      Phone: json.phone,
      Bucket: json.bucket,
      Key: b.key,
      FirstPing: b.first || "",
      LastPing: b.last || "",
      Pings: b.pings,
      DistanceKm: b.distanceKm,
    }));

    const csv = new Json2Csv().parse(rows);
    res.header("Content-Type", "text/csv");
    res.attachment(`summary-${json.name}-${json.bucket}.csv`);
    res.send(csv);
  } catch (e) {
    console.error("GET /report/summary/:id.csv error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

function filterByAccuracy(points, maxAcc) {
  return points.filter((p) => {
    if (!p.lat || !p.lon) return false;
    if (p.lat === 0 || p.lon === 0) return false;
    if (p.lat < 6 || p.lat > 37) return false;
    if (p.lon < 68 || p.lon > 97) return false;
    if (typeof p.acc === "number" && p.acc > maxAcc) return false;
    return true;
  });
}

function sampleByMinSeconds(points, minSeconds) {
  if (!minSeconds || minSeconds <= 0) return points;
  const out = [];
  let lastTs = 0;
  for (const p of points) {
    const t = new Date(p.ts).getTime();
    if (!lastTs || (t - lastTs) / 1000 >= minSeconds) {
      out.push(p);
      lastTs = t;
    }
  }
  return out;
}

function toCoords(points) {
  return points.map((p) => [p.lat, p.lon]); // [lat, lon] for Leaflet Polyline
}

function routeStats(points, opts = {}) {
  // assumes points are sorted by ts ascending
  let distanceKm = 0;
  let prev = null;
  const maxJumpKm = opts.maxJumpKm ?? 10;

  for (const p of points) {
    if (!prev) {
      prev = p;
      continue;
    }
    const d = haversineKm(prev.lat, prev.lon, p.lat, p.lon);
    if (d <= maxJumpKm) distanceKm += d;
    prev = p;
  }
  return {
    first: points[0]?.ts || null,
    last: points[points.length - 1]?.ts || null,
    pings: points.length,
    distanceKm: Number(distanceKm.toFixed(2)),
  };
}

/* ====================== DAY TRACK ======================
GET /api/tracking/track/day/:id?date=YYYY-MM-DD&maxAcc=500&sampleSec=60
Returns:
{
  date, userId, points: [...], coords: [[lat,lon]..], stats: {...}
}
========================================================= */
router.get("/track/day/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const date = (req.query.date || ymdUTC(new Date())).toString();
    const maxAcc = Number(req.query.maxAcc || 500);
    const sampleSec = Number(req.query.sampleSec || 0);

    const from = startOfDayUTC(date);
    const to = endOfDayUTC(date);

    let pts = await LocationPoint.find({
      user: id,
      ts: { $gte: from, $lte: to },
    })
      .sort({ ts: 1 })
      .lean();

    pts = filterByAccuracy(pts, maxAcc);
    pts = sampleByMinSeconds(pts, sampleSec);

    const coords = toCoords(pts);
    const stats = routeStats(pts);

    // ✅ Reverse geocode first & last points
    let startAddress = null,
      endAddress = null;
    if (pts.length > 0)
      startAddress = await reverseGeocode(pts[0].lat, pts[0].lon);
    if (pts.length > 1)
      endAddress = await reverseGeocode(
        pts[pts.length - 1].lat,
        pts[pts.length - 1].lon
      );

    // ✅ Detect stops/breaks (>10 minutes, <50m movement)
    const stops = [];
    const STOP_MIN_MINUTES = 10;
    const STOP_MAX_MOVE_METERS = 50;

    let cluster = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const dtMin =
        (new Date(curr.ts).getTime() - new Date(prev.ts).getTime()) / 60000;
      const distKm = haversineKm(prev.lat, prev.lon, curr.lat, curr.lon);

      // If within 50 meters (0.05km) → same stop area
      if (distKm * 1000 < STOP_MAX_MOVE_METERS) {
        cluster.push(curr);
      } else {
        // Evaluate previous cluster
        const duration =
          (new Date(cluster[cluster.length - 1].ts).getTime() -
            new Date(cluster[0].ts).getTime()) /
          60000;
        if (duration >= STOP_MIN_MINUTES) {
          const avgLat =
            cluster.reduce((s, p) => s + p.lat, 0) / cluster.length;
          const avgLon =
            cluster.reduce((s, p) => s + p.lon, 0) / cluster.length;
          const addr = await reverseGeocode(avgLat, avgLon);
          stops.push({
            start: cluster[0].ts,
            end: cluster[cluster.length - 1].ts,
            durationMin: Math.round(duration),
            lat: avgLat,
            lon: avgLon,
            address: addr,
          });
        }
        cluster = [curr];
      }
    }

    // Check last cluster
    if (cluster.length > 1) {
      const duration =
        (new Date(cluster[cluster.length - 1].ts).getTime() -
          new Date(cluster[0].ts).getTime()) /
        60000;
      if (duration >= STOP_MIN_MINUTES) {
        const avgLat = cluster.reduce((s, p) => s + p.lat, 0) / cluster.length;
        const avgLon = cluster.reduce((s, p) => s + p.lon, 0) / cluster.length;
        const addr = await reverseGeocode(avgLat, avgLon);
        stops.push({
          start: cluster[0].ts,
          end: cluster[cluster.length - 1].ts,
          durationMin: Math.round(duration),
          lat: avgLat,
          lon: avgLon,
          address: addr,
        });
      }
    }

    res.json({
      userId: id,
      date,
      points: pts,
      coords,
      stats,
      startAddress,
      endAddress,
      stops, // ✅ include stop points here
    });
  } catch (e) {
    console.error("GET /track/day/:id error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

/* ====================== RANGE TRACK (grouped by day) ======================
GET /api/tracking/track/range/:id?from=ISO&to=ISO&maxAcc=500&sampleSec=60

Returns:
{
  userId, from, to, days: [
    { date, points:[...], coords:[[lat,lon]...], stats:{...} }
  ]
}
========================================================================= */
router.get("/track/range/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const from = normDate(req.query.from, new Date(Date.now() - 7 * 864e5));
    const to = normDate(req.query.to, new Date());
    const maxAcc = Number(req.query.maxAcc || 500);
    const sampleSec = Number(req.query.sampleSec || 0);

    let pts = await LocationPoint.find({
      user: id,
      ts: { $gte: from, $lte: to },
    })
      .sort({ ts: 1 })
      .lean();

    pts = filterByAccuracy(pts, maxAcc);
    pts = sampleByMinSeconds(pts, sampleSec);

    // group by day
    const byDay = new Map();
    for (const p of pts) {
      const key = ymdUTC(p.ts);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(p);
    }

    const days = [];
    for (const [date, arr] of byDay.entries()) {
      const coords = toCoords(arr);
      const stats = routeStats(arr);
      days.push({ date, points: arr, coords, stats });
    }
    days.sort((a, b) => (a.date < b.date ? -1 : 1));

    res.json({
      userId: id,
      from: from.toISOString(),
      to: to.toISOString(),
      days,
    });
  } catch (e) {
    console.error("GET /track/range/:id error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================ CSV for a day track =================
GET /api/tracking/export/track/day/:id.csv?date=YYYY-MM-DD&maxAcc=500&sampleSec=60
====================================================== */
router.get("/export/track/day/:id.csv", async (req, res) => {
  try {
    const json = await new Promise((resolve, reject) => {
      router.handle(
        { ...req, method: "GET", url: `/track/day/${req.params.id}` },
        { json: resolve, status: () => ({ json: reject }) },
        () => {}
      );
    });

    const rows = json.points.map((p) => ({
      Timestamp: p.ts,
      Latitude: p.lat,
      Longitude: p.lon,
      Accuracy_m: p.acc ?? "",
      Speed: p.speed ?? "",
      Heading: p.heading ?? "",
      Provider: p.provider ?? "",
    }));

    const csv = new Json2Csv().parse(rows);
    res.header("Content-Type", "text/csv");
    res.attachment(`track-${json.userId}-${json.date}.csv`);
    res.send(csv);
  } catch (e) {
    console.error("GET /export/track/day/:id.csv error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

/* ============================================================
   ✅ POST: Record new client visit (from DSE mobile app)
   Body fields expected:
   - clientName, clientMobile, currentAddress, permanentAddress
   - lat, lon, acc, photoUrl, photoPublicId
============================================================ */
router.post("/client-visit", auth, async (req, res) => {
  try {
    const {
      clientName,
      clientMobile,
      currentAddress,
      permanentAddress,
      lat,
      lon,
      acc,
      photoUrl,
      photoPublicId,
    } = req.body;

    if (
      !clientName ||
      !currentAddress ||
      !permanentAddress ||
      !lat ||
      !lon ||
      !photoUrl
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const dse = await Dse.findById(req.user.id).lean();
    if (!dse) return res.status(404).json({ message: "DSE not found" });

    const visit = await ClientVisit.create({
      dse: dse._id,
      dseName: dse.name,
      dsePhone: dse.phone,
      clientName,
      clientMobile,
      currentAddress,
      permanentAddress,
      location: { lat, lon, acc },
      photoUrl,
      photoPublicId,
    });

    res.json({ ok: true, visit });
  } catch (err) {
    console.error("POST /client-visit error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ============================================================
   ✅ GET: Fetch all client visits (for Admin dashboard)
   Optional query params:
   - dseId, from, to
============================================================ */
router.get("/client-visits", async (req, res) => {
  try {
    const { from, to, dseId } = req.query;
    const q = {};
    if (dseId) q.dse = dseId;
    if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = new Date(from);
      if (to) q.createdAt.$lte = new Date(to);
    }

    const visits = await ClientVisit.find(q).sort({ createdAt: -1 }).lean();

    res.json(
      visits.map((v) => ({
        _id: v._id,
        dse: v.dse,
        dseName: v.dseName,
        dsePhone: v.dsePhone,
        clientName: v.clientName,
        clientMobile: v.clientMobile,
        currentAddress: v.currentAddress,
        permanentAddress: v.permanentAddress,
        location: v.location,
        photoUrl: v.photoUrl,
        photoPublicId: v.photoPublicId,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      }))
    );
  } catch (err) {
    console.error("GET /client-visits error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ============================================================
   ✅ CSV export for Admin
============================================================ */
router.get("/export/client-visits.csv", async (req, res) => {
  try {
    const visits = await ClientVisit.find({}).sort({ createdAt: -1 }).lean();

    const rows = visits.map((v) => ({
      DSE: v.dseName,
      "DSE Phone": v.dsePhone,
      "Client Name": v.clientName,
      "Client Mobile": v.clientMobile,
      "Current Address": v.currentAddress,
      "Permanent Address": v.permanentAddress,
      Latitude: v.location.lat,
      Longitude: v.location.lon,
      Accuracy_m: v.location.acc ?? "",
      Photo: v.photoUrl,
      Date: new Date(v.createdAt).toLocaleString(),
    }));

    const csv = new Json2Csv().parse(rows);
    res.header("Content-Type", "text/csv");
    res.attachment("client-visits.csv");
    res.send(csv);
  } catch (err) {
    console.error("GET /export/client-visits.csv error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
