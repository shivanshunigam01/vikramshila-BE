// routes/tracking.js
import express from "express";
import auth from "../middleware/authenticate.js";
import Dse from "../models/Dse.js";
import LocationPoint from "../models/LocationPoint.js";
import { Parser as Json2Csv } from "json2csv";

const router = express.Router();

/* ============================================================
   Helpers
============================================================ */

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
function byTsAsc(a, b) {
  return new Date(a.ts).getTime() - new Date(b.ts).getTime();
}

/* ============================================================
   Basic health
============================================================ */
router.get("/ping", (_req, res) => res.json({ ok: true }));

/* ============================================================
   Ingestion: save multiple locations
   Body: { points: [{ ts, lat, lon, acc?, speed?, heading?, battery?, provider? }, ...] }
============================================================ */
router.post("/locations", async (req, res) => {
  try {
    const userId = req.user.id;

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
      ip,
      ua,
    }));

    await LocationPoint.insertMany(docs, { ordered: false });
    res.json({ saved: docs.length });
  } catch (err) {
    console.error("POST /locations error:", err);
    res.status(500).json({ message: "Server error" });
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
    if (from || to) q.ts = {};
    if (from) q.ts.$gte = new Date(from);
    if (to) q.ts.$lte = new Date(to);

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
   Latest for all + joined with DSE info (name/phone)
   GET /latest-all-with-dse?activeWithinMinutes=60
============================================================ */
router.get("/latest-all-with-dse", async (req, res) => {
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
        $lookup: {
          from: "dses",
          localField: "user",
          foreignField: "_id",
          as: "dse",
        },
      },
      { $unwind: "$dse" },
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
          dseName: "$dse.name",
          dsePhone: "$dse.phone",
        },
      },
    ];

    const rows = await LocationPoint.aggregate(pipeline);
    res.json(rows);
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

export default router;
