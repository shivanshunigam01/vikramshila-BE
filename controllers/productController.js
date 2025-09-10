// controllers/productController.js
import Product from "../models/Product.js";
import { ok, created, bad } from "../utils/response.js";
import { cloudinary } from "../utils/cloudinary.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const toStringArray = (v) =>
  Array.isArray(v) ? v.filter(Boolean) : [v].filter(Boolean);

const toDriverComfort = (v) => {
  if (v === undefined || v === null || String(v).trim() === "")
    return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(10, n));
};

export const create = async (req, res) => {
  try {
    // ✅ Ensure price is always string
    if (req.body.price !== undefined && req.body.price !== "") {
      req.body.price = String(req.body.price).trim();
    }

    // ✅ Product images (Cloudinary)
    const images = (req.files?.images || []).map((f) => f.path);

    // ✅ Reviews (Cloudinary or JSON/body)
    let reviews = [];
    if (req.files?.reviewFiles) {
      reviews = req.files.reviewFiles.map((f, i) => ({
        type: f.mimetype.startsWith("video") ? "video" : "photo",
        content: req.body.reviews?.[i]?.content || "",
        customerName: req.body.reviews?.[i]?.customerName || "",
        customerLocation: req.body.reviews?.[i]?.customerLocation || "",
        rating: req.body.reviews?.[i]?.rating || null,
        file: f.path,
      }));
    } else if (req.body.reviews) {
      try {
        const parsedReviews = JSON.parse(req.body.reviews);
        reviews = parsedReviews.map((r) => ({
          type: r.type || "photo",
          content: r.content || "",
          customerName: r.customerName || "",
          customerLocation: r.customerLocation || "",
          rating: r.rating || null,
          file: r.file || null,
        }));
      } catch {
        reviews = Array.isArray(req.body.reviews)
          ? req.body.reviews
          : [req.body.reviews];
      }
    }

    // ✅ Testimonials (Cloudinary or JSON/body)
    let testimonials = [];
    if (req.files?.testimonialFiles) {
      testimonials = req.files.testimonialFiles.map((f, i) => ({
        type: f.mimetype.startsWith("video") ? "video" : "photo",
        content: req.body.testimonials?.[i]?.content || "",
        customerName: req.body.testimonials?.[i]?.customerName || "",
        customerLocation: req.body.testimonials?.[i]?.customerLocation || "",
        customerDesignation:
          req.body.testimonials?.[i]?.customerDesignation || "",
        file: f.path,
      }));
    } else if (req.body.testimonials) {
      try {
        const parsedTestimonials = JSON.parse(req.body.testimonials);
        testimonials = parsedTestimonials.map((t) => ({
          type: t.type || "photo",
          content: t.content || "",
          customerName: t.customerName || "",
          customerLocation: t.customerLocation || "",
          customerDesignation: t.customerDesignation || "",
          file: t.file || null,
        }));
      } catch {
        testimonials = Array.isArray(req.body.testimonials)
          ? req.body.testimonials
          : [req.body.testimonials];
      }
    }

    // ✅ Brochure (Local disk storage)
    let brochureFile = null;
    if (req.files?.brochureFile && req.files.brochureFile[0]) {
      const file = req.files.brochureFile[0];
      brochureFile = {
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
      };
    }

    // ✅ Create product with all fields from frontend (PLUS the 2 new fields)
    const product = await Product.create({
      title: req.body.title || "",
      description: req.body.description || "",
      seatAvailability: req.body.seatAvailability || "",
      mileage: req.body.mileage || "",
      tyresCost: req.body.tyresCost || "",
      tyreLife: req.body.tyreLife || "",
      freightRate: req.body.freightRate || "",
      category: req.body.category || "",
      price: req.body.price || "",
      status: req.body.status || "active",
      newLaunch: req.body.newLaunch === "1" || req.body.newLaunch === 1 ? 1 : 0,

      // Vehicle Specs
      gvw: req.body.gvw || "",
      engine: req.body.engine || "",
      fuelType: req.body.fuelType || "",
      gearBox: req.body.gearBox || "",
      clutchDia: req.body.clutchDia || "",
      torque: req.body.torque || "",
      tyre: req.body.tyre || "",
      fuelTankCapacity: req.body.fuelTankCapacity || "",
      cabinType: req.body.cabinType || "",
      warranty: req.body.warranty || "",
      applicationSuitability: req.body.applicationSuitability || "",
      payload: req.body.payload || "",
      deckWidth: Array.isArray(req.body.deckWidth)
        ? req.body.deckWidth
        : [req.body.deckWidth].filter(Boolean),
      deckLength: Array.isArray(req.body.deckLength)
        ? req.body.deckLength
        : [req.body.deckLength].filter(Boolean),
      bodyDimensions: req.body.bodyDimensions || "",
      tco: req.body.tco || "",
      profitMargin: req.body.profitMargin || "",
      usp: Array.isArray(req.body.usp)
        ? req.body.usp
        : [req.body.usp].filter(Boolean),

      // Files
      images,
      brochureFile,

      // Reviews & Testimonials
      reviews,
      testimonials,

      // ✅ NEW FIELDS
      monitoringFeatures: toStringArray(req.body.monitoringFeatures),
      driverComfort: toDriverComfort(req.body.driverComfort),
    });

    return res.status(201).json({ message: "Product created", product });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message });
  }
};
export const list = async (req, res) => {
  try {
    const { q } = req.query;

    const filter = q ? { title: new RegExp(q, "i") } : {};

    // Sort by category first, then by createdAt (descending)
    const items = await Product.find(filter).sort({
      category: 1,
      createdAt: -1,
    });

    return ok(res, items);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
export const get = async (req, res) => {
  const item = await Product.findById(req.params.id);
  if (!item) return bad(res, "Not found", 404);
  return ok(res, item);
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return bad(res, "Product not found");

    if (req.body.price !== undefined && req.body.price !== "") {
      req.body.price = String(req.body.price).trim();
    }

    // Product images
    const images = (req.files?.images || []).map((f) => f.path);

    // Reviews
    let reviews = [];
    if (req.files?.reviewFiles) {
      reviews = req.files.reviewFiles.map((f, i) => ({
        type: f.mimetype.startsWith("video") ? "video" : "photo",
        content: req.body.reviews?.[i]?.content || "",
        customerName: req.body.reviews?.[i]?.customerName || "",
        customerLocation: req.body.reviews?.[i]?.customerLocation || "",
        rating: req.body.reviews?.[i]?.rating || null,
        file: f.path,
      }));
    } else if (req.body.reviews) {
      try {
        const parsedReviews = JSON.parse(req.body.reviews);
        reviews = parsedReviews.map((r) => ({
          type: r.type || "photo",
          content: r.content || "",
          customerName: r.customerName || "",
          customerLocation: r.customerLocation || "",
          rating: r.rating || null,
          file: r.file || null,
        }));
      } catch {
        reviews = Array.isArray(req.body.reviews)
          ? req.body.reviews
          : [req.body.reviews];
      }
    }

    // Testimonials
    let testimonials = [];
    if (req.files?.testimonialFiles) {
      testimonials = req.files.testimonialFiles.map((f, i) => ({
        type: f.mimetype.startsWith("video") ? "video" : "photo",
        content: req.body.testimonials?.[i]?.content || "",
        customerName: req.body.testimonials?.[i]?.customerName || "",
        customerLocation: req.body.testimonials?.[i]?.customerLocation || "",
        customerDesignation:
          req.body.testimonials?.[i]?.customerDesignation || "",
        file: f.path,
      }));
    } else if (req.body.testimonials) {
      try {
        const parsedTestimonials = JSON.parse(req.body.testimonials);
        testimonials = parsedTestimonials.map((t) => ({
          type: t.type || "photo",
          content: t.content || "",
          customerName: t.customerName || "",
          customerLocation: t.customerLocation || "",
          customerDesignation: t.customerDesignation || "",
          file: t.file || null,
        }));
      } catch {
        testimonials = Array.isArray(req.body.testimonials)
          ? req.body.testimonials
          : [req.body.testimonials];
      }
    }

    // ✅ Brochure handling (replace & delete old local file)
    let brochureFile = product.brochureFile;
    if (req.files?.brochureFile && req.files.brochureFile[0]) {
      if (
        product.brochureFile?.path &&
        fs.existsSync(product.brochureFile.path)
      ) {
        try {
          fs.unlinkSync(product.brochureFile.path);
        } catch (error) {
          console.warn("Failed to delete old brochure:", error.message);
        }
      }
      const file = req.files.brochureFile[0];
      brochureFile = {
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
      };
    }

    // ✅ Assign all fields (including NEW FIELDS)
    Object.assign(product, {
      title: req.body.title || product.title,
      description: req.body.description || product.description,
      seatAvailability: req.body.seatAvailability || product.seatAvailability,
      mileage: req.body.mileage || product.mileage,
      tyresCost: req.body.tyresCost || product.tyresCost,
      tyreLife: req.body.tyreLife || product.tyreLife,
      freightRate: req.body.freightRate || product.freightRate,
      category: req.body.category || product.category,
      price: req.body.price || product.price,
      status: req.body.status || product.status,
      newLaunch:
        req.body.newLaunch !== undefined
          ? req.body.newLaunch === "1" || req.body.newLaunch === 1
            ? 1
            : 0
          : product.newLaunch,

      gvw: req.body.gvw || product.gvw,
      engine: req.body.engine || product.engine,
      fuelType: req.body.fuelType || product.fuelType,
      gearBox: req.body.gearBox || product.gearBox,
      clutchDia: req.body.clutchDia || product.clutchDia,
      torque: req.body.torque || product.torque,
      tyre: req.body.tyre || product.tyre,
      fuelTankCapacity: req.body.fuelTankCapacity || product.fuelTankCapacity,
      cabinType: req.body.cabinType || product.cabinType,
      warranty: req.body.warranty || product.warranty,
      applicationSuitability:
        req.body.applicationSuitability || product.applicationSuitability,
      payload: req.body.payload || product.payload,
      deckWidth: Array.isArray(req.body.deckWidth)
        ? req.body.deckWidth
        : product.deckWidth,
      deckLength: Array.isArray(req.body.deckLength)
        ? req.body.deckLength
        : product.deckLength,
      bodyDimensions: req.body.bodyDimensions || product.bodyDimensions,
      tco: req.body.tco || product.tco,
      profitMargin: req.body.profitMargin || product.profitMargin,
      usp: Array.isArray(req.body.usp) ? req.body.usp : product.usp,

      images: images.length ? images : product.images,
      brochureFile: brochureFile,
      reviews: reviews.length ? reviews : product.reviews,
      testimonials: testimonials.length ? testimonials : product.testimonials,

      // ✅ NEW FIELDS
      monitoringFeatures:
        req.body.monitoringFeatures !== undefined
          ? toStringArray(req.body.monitoringFeatures)
          : product.monitoringFeatures,

      driverComfort:
        req.body.driverComfort !== undefined
          ? toDriverComfort(req.body.driverComfort)
          : product.driverComfort,
    });

    await product.save();
    return ok(res, product, "Product updated successfully");
  } catch (error) {
    console.error(error);
    return bad(res, "Failed to update product");
  }
};

export const remove = async (req, res) => {
  const item = await Product.findById(req.params.id);
  if (!item) return bad(res, "Not found", 404);

  // Delete images from Cloudinary if you stored public_id
  for (const img of item.images || []) {
    if (img.public_id) {
      await cloudinary.uploader.destroy(img.public_id);
    }
  }

  // Delete local brochure file
  if (item.brochureFile?.path && fs.existsSync(item.brochureFile.path)) {
    try {
      fs.unlinkSync(item.brochureFile.path);
    } catch (error) {
      console.warn("Failed to delete brochure file:", error.message);
    }
  }

  await item.deleteOne();
  return ok(res, {}, "Deleted");
};

export const downloadBrochure = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product?.brochureFile?.path) {
      return res.status(404).send("Brochure not found");
    }

    const filePath = path.resolve(product.brochureFile.path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send("File does not exist");
    }

    // 🔹 Set proper headers for PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${
        product.brochureFile.originalName || "brochure.pdf"
      }"`
    );

    // 🔹 Stream file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).send("Server error");
  }
};
// 🔹 Filter Products

export const filterProducts = async (req, res) => {
  try {
    const { application, fuelType, payload, priceRange } = req.body || {};

    // 1) Quick text filters
    const textMatch = {};
    if (application && application.toLowerCase() !== "all") {
      textMatch.applicationSuitability = { $regex: application, $options: "i" };
    }
    if (fuelType && fuelType.toLowerCase() !== "all") {
      textMatch.fuelType = { $regex: fuelType, $options: "i" };
    }

    // 2) Parse UI ranges
    const parseRange = (str) => {
      if (!str || String(str).toLowerCase() === "all") return null;
      const s = String(str).trim();
      if (s.endsWith("+")) {
        const min = parseInt(s.slice(0, -1).trim(), 10);
        return Number.isFinite(min) ? { type: "gte", min } : null;
      }
      if (s.includes("-")) {
        const [a, b] = s.split("-");
        const min = parseInt(String(a).trim(), 10);
        const max = parseInt(String(b).trim(), 10);
        return Number.isFinite(min) && Number.isFinite(max)
          ? { type: "between", min, max }
          : null;
      }
      return null;
    };
    const payloadFilter = parseRange(payload);

    const parsePriceRange = (str) => {
      if (!str || String(str).toLowerCase() === "all") return null;
      const s = String(str).trim().toUpperCase();

      const toINR = (token) => {
        const hasL = token.includes("L");
        const num = parseFloat(token.replace(/L/gi, "").trim());
        if (!Number.isFinite(num)) return null;
        return hasL ? Math.round(num * 100000) : Math.round(num);
      };

      if (s.endsWith("L+")) {
        const min = toINR(s.replace(/L\+$/i, ""));
        return Number.isFinite(min) ? { type: "gte", min } : null;
      }
      if (s.endsWith("+")) {
        const min = toINR(s.replace(/\+$/, ""));
        return Number.isFinite(min) ? { type: "gte", min } : null;
      }
      if (s.includes("-")) {
        const [a, b] = s.split("-");
        const min = toINR(a);
        const max = toINR(b);
        return Number.isFinite(min) && Number.isFinite(max)
          ? { type: "between", min, max }
          : null;
      }
      return null;
    };
    const priceFilter = parsePriceRange(priceRange);

    // 3) Build char-wise helpers (no $split / regex)
    const digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    const charArray = (field) => ({
      $map: {
        input: { $range: [0, { $strLenCP: { $ifNull: [field, ""] } }] },
        as: "i",
        in: { $substrCP: [{ $ifNull: [field, ""] }, "$$i", 1] },
      },
    });

    // keep digits + one dot (we allow '.' to support 1.5T)
    const numberStringWithDot = (field) => ({
      $let: {
        vars: {
          chars: charArray(field),
        },
        in: {
          $reduce: {
            input: "$$chars",
            initialValue: { s: "", hasDot: false },
            in: {
              s: {
                $cond: [
                  { $in: ["$$this", digits] },
                  { $concat: ["$$value.s", "$$this"] },
                  {
                    // allow a single dot
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$$this", "."] },
                          { $eq: ["$$value.hasDot", false] },
                        ],
                      },
                      { $concat: ["$$value.s", "."] },
                      "$$value.s",
                    ],
                  },
                ],
              },
              hasDot: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$$this", "."] },
                      { $eq: ["$$value.hasDot", false] },
                    ],
                  },
                  true,
                  "$$value.hasDot",
                ],
              },
            },
          },
        },
      },
    });

    const numericFromString = (field) => ({
      $convert: {
        input: {
          $let: {
            vars: { ns: numberStringWithDot(field) },
            in: {
              $cond: [{ $gt: [{ $strLenCP: "$$ns.s" }, 0] }, "$$ns.s", "0"],
            },
          },
        },
        to: "double",
        onError: 0,
        onNull: 0,
      },
    });

    // Detect tons vs kg on payload, convert to KG
    const payloadKgExpr = {
      $let: {
        vars: {
          upper: { $toUpper: { $ifNull: ["$payload", ""] } },
          base: numericFromString("$payload"), // double, may be 1.5 for "1.5T"
        },
        in: {
          $toInt: {
            $cond: [
              {
                $gt: [
                  {
                    $indexOfCP: [
                      "$$upper",
                      "T", // covers "T", "TON", "T."
                    ],
                  },
                  -1,
                ],
              },
              { $round: { $multiply: ["$$base", 1000] } }, // T -> KG
              { $round: "$$base" }, // already KG
            ],
          },
        },
      },
    };

    // Price to INR (supports "₹10,00,000", "1000000", or "10L")
    const priceInrExpr = {
      $let: {
        vars: {
          upper: { $toUpper: { $ifNull: ["$price", ""] } },
          base: numericFromString("$price"),
        },
        in: {
          $toInt: {
            $cond: [
              {
                $gt: [{ $indexOfCP: ["$$upper", "L"] }, -1],
              },
              { $round: { $multiply: ["$$base", 100000] } },
              { $round: "$$base" },
            ],
          },
        },
      },
    };

    // 4) Pipeline
    const pipeline = [];
    if (Object.keys(textMatch).length) pipeline.push({ $match: textMatch });

    pipeline.push({
      $addFields: {
        _numPayloadKg: payloadKgExpr,
        _numPriceInr: priceInrExpr,
      },
    });

    const exprAnd = [];
    if (payloadFilter) {
      if (payloadFilter.type === "between") {
        exprAnd.push(
          { $gte: ["$_numPayloadKg", payloadFilter.min] },
          { $lte: ["$_numPayloadKg", payloadFilter.max] }
        );
      } else {
        exprAnd.push({ $gte: ["$_numPayloadKg", payloadFilter.min] });
      }
    }
    if (priceFilter) {
      if (priceFilter.type === "between") {
        exprAnd.push(
          { $gte: ["$_numPriceInr", priceFilter.min] },
          { $lte: ["$_numPriceInr", priceFilter.max] }
        );
      } else {
        exprAnd.push({ $gte: ["$_numPriceInr", priceFilter.min] });
      }
    }
    if (exprAnd.length) pipeline.push({ $match: { $expr: { $and: exprAnd } } });

    pipeline.push({ $sort: { createdAt: -1 } });
    pipeline.push({ $project: { _numPayloadKg: 0, _numPriceInr: 0 } });

    const products = await Product.aggregate(pipeline);

    return res.status(200).json({
      success: true,
      totalProducts: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Filter error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get distinct applicationSuitability values
export const getUniqueApplications = async (req, res) => {
  try {
    // Fetch only the `applicationSuitability` field
    const products = await Product.find({}, "applicationSuitability");

    // Collect and split values
    let applications = [];
    products.forEach((p) => {
      if (p.applicationSuitability) {
        const parts = p.applicationSuitability
          .split(",")
          .map((item) => item.trim());
        applications.push(...parts);
      }
    });

    // Deduplicate
    const uniqueApplications = [...new Set(applications)];

    res.json({
      success: true,
      data: uniqueApplications,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
