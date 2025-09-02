const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const morgan = require("morgan");
const fs = require("fs");

dotenv.config();
const app = express();

// Middleware
app.use(morgan("dev"));
app.use(
  cors({
    origin: [
      "http://localhost:8080",
      "http://localhost:8081",
      "http://34.68.6.114:8081",
      "http://34.68.6.114:8081/",
      "https://www.vikramshilaautomobiles.com",
      "https://www.vikramshilaautomobiles.com/",
      "https://vikramshila-admin-panel.vercel.app",
      "",
    ],
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

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/schemes", require("./routes/schemeRoutes"));
app.use("/api/testimonials", require("./routes/testimonialRoutes"));
app.use("/api/launches", require("./routes/launchRoutes"));
app.use("/api/services", require("./routes/serviceRoutes"));
app.use("/api/enquiries", require("./routes/enquiryRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/upload", require("./routes/uploadRoutes"));
app.use("/api/leads", require("./routes/leadRoutes")); // ✅ FIXED: using here
app.use("/api/service-booking", require("./routes/serviceBookingRoutes"));
// app.use("/api/otp", require("./routes/otpRoutes"));
app.use("/api/banners", require("./routes/bannerRoutes"));

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

module.exports = app;
