// server.js (ESM)
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import morgan from "morgan";
import fs from "fs";
import { fileURLToPath } from "url";

// Load env
dotenv.config();

const app = express();
app.set("trust proxy", true);

// __dirname polyfill (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static public
app.use("/public", express.static(path.join(__dirname, "public")));

// Middleware
app.use(morgan("dev"));
app.use(
  cors({
    origin: [
      "http://localhost:8080",
      "http://localhost:8081",
      "http://localhost:8082",
      "http://34.68.6.114:8081",
      "http://34.68.6.114:8081/",
      "https://www.vikramshilaautomobiles.com",
      "https://www.vikramshilaautomobiles.com/",
      "https://vikramshila-admin-panel.vercel.app",
      "",
      // ✅ added
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://zentrover.com",
      "https://www.zentroverse.com",
      "https://zentroverse.com/landing",
      "https://zentroverse.com/",
      "http://34.68.6.114:8081/",
    ],
    origin: true, // reflect the request's Origin header (allows all)
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directories
const uploadsBase = path.join(__dirname, "uploads");
const subdirs = [
  "products",
  "schemes",
  "testimonials",
  "launches",
  "services",
  "misc",
];
if (!fs.existsSync(uploadsBase)) fs.mkdirSync(uploadsBase);
for (const dir of subdirs) {
  const p = path.join(uploadsBase, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p);
}

// Static /uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- Routes (ESM imports – note the .js extensions) ---
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import schemeRoutes from "./routes/schemeRoutes.js";
import testimonialRoutes from "./routes/testimonialRoutes.js";
import launchRoutes from "./routes/launchRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import enquiryRoutes from "./routes/enquiryRoutes.js";
import reportsRoutes from "./routes/reports.routes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import serviceBookingRoutes from "./routes/serviceBookingRoutes.js";
import bannerRoutes from "./routes/bannerRoutes.js";
import grievanceRoutes from "./routes/grievanceRoutes.js";
import creditReportRoutes from "./routes/creditReport.js";
import paymentRoutes from "./routes/payment.routes.js";
import trackingRoutes from "./routes/tracking.js";
import newsletterRoutes from "./routes/newsletter.js";
import videoRoutes from "./routes/videoRoutes.js";
import competitionRoutes from "./routes/competitionRoutes.js";

app.use("/api/competition-products", competitionRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/credit", creditReportRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/schemes", schemeRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/launches", launchRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/leads", leadRoutes); // 👈 base path for your leads router
app.use("/api/service-booking", serviceBookingRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/grievances", grievanceRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/videos", videoRoutes);

// Health check
app.get("/", (req, res) =>
  res.json({ status: "ok", app: "vikramshila-backend" })
);

// DB connect & start
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vikramshila";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB:", MONGODB_URI);
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("MongoDB connection error:", err));

export default app; // ESM default export
