// controllers/competitionProductController.js
import CompetitionProduct from "../models/CompetitionProduct.js";
import Product from "../models/Product.js";
import { ok, created, bad } from "../utils/response.js";
import { cloudinary } from "../utils/cloudinary.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Helpers ----------
const toStringArray = (v) =>
  Array.isArray(v) ? v.filter(Boolean) : [v].filter(Boolean);

const toDriverComfort = (v) => {
  if (v === undefined || v === null || String(v).trim() === "")
    return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(10, n));
};

// Extract Cloudinary public_id from URL (for delete)
const extractCloudinaryPublicId = (url) => {
  if (!url || typeof url !== "string") return null;
  try {
    const uploadIndex = url.indexOf("/upload/");
    if (uploadIndex === -1) return null;

    const afterUpload = url.substring(uploadIndex + "/upload/".length);
    const withoutQuery = afterUpload.split(/[?#]/)[0]; // strip query/hash
    const withoutExt = withoutQuery.replace(/\.[^/.]+$/, ""); // remove extension
    return withoutExt || null;
  } catch {
    return null;
  }
};

// Normalize review/testimonial type -> only "photo" or "video"
const normalizeReviewArray = (arr) =>
  (arr || []).map((r) => {
    if (!r || typeof r !== "object") {
      return {
        type: "photo",
        content: r ? String(r) : "",
      };
    }
    const rawType = r.type;
    const type = rawType === "video" ? "video" : "photo"; // text/undefined -> photo
    return { ...r, type };
  });

// ---------- CREATE (like Product.create) ----------
export const createCompetitionProduct = async (req, res) => {
  try {
    // Ensure price is always string
    if (req.body.price !== undefined && req.body.price !== "") {
      req.body.price = String(req.body.price).trim();
    }

    // Images (Cloudinary URLs)
    const images = (req.files?.images || []).map((f) => f.path);

    // Reviews (Cloudinary or JSON/body)
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
          type: r.type, // normalize later
          content: r.content || "",
          customerName: r.customerName || "",
          customerLocation: r.customerLocation || "",
          rating: r.rating || null,
          file: r.file || null,
        }));
      } catch {
        // Already structured object/array from form-data
        reviews = Array.isArray(req.body.reviews)
          ? req.body.reviews
          : [req.body.reviews];
      }
    }
    // 🔥 normalize "text" -> "photo" etc.
    reviews = normalizeReviewArray(reviews);

    // Testimonials (Cloudinary or JSON/body)
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
          type: t.type, // normalize later
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
    // 🔥 normalize "text" -> "photo" etc.
    testimonials = normalizeReviewArray(testimonials);

    // Brochure (local)
    let brochureFile = null;
    if (req.files?.brochureFile && req.files.brochureFile[0]) {
      const file = req.files.brochureFile[0];
      brochureFile = {
        filename: file.filename,
        originalName: file.originalname,
        path: `/uploads/brochures/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype,
      };
    }

    // Create competition product (same fields as Product + brand, model)
    const product = await CompetitionProduct.create({
      brand: req.body.brand || "",
      model: req.body.model || "",
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

      // NEW FIELDS
      monitoringFeatures: toStringArray(req.body.monitoringFeatures),
      driverComfort: toDriverComfort(req.body.driverComfort),
    });

    return res.status(201).json({
      message: "Competition product created",
      product,
    });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message });
  }
};

// ---------- LIST (like Product.list) ----------
export const getCompetitionProducts = async (req, res) => {
  try {
    const { q } = req.query;

    const filter = q
      ? {
          $or: [
            { title: new RegExp(q, "i") },
            { brand: new RegExp(q, "i") },
            { model: new RegExp(q, "i") },
          ],
        }
      : {};

    const items = await CompetitionProduct.find(filter).sort({
      category: 1,
      createdAt: -1,
    });

    return ok(res, items);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- GET BY ID (like Product.get) ----------
export const getCompetitionProductById = async (req, res) => {
  const item = await CompetitionProduct.findById(req.params.id);
  if (!item) return bad(res, "Competitor product not found", 404);
  return ok(res, item);
};

// ---------- UPDATE (like Product.update) ----------
export const updateCompetitionProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await CompetitionProduct.findById(id);
    if (!product) return bad(res, "Competition product not found");

    if (req.body.price !== undefined && req.body.price !== "") {
      req.body.price = String(req.body.price).trim();
    }

    // Images
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
          type: r.type,
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
    // 🔥 normalize "text" -> "photo" etc.
    reviews = normalizeReviewArray(reviews);

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
          type: t.type,
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
    // 🔥 normalize "text" -> "photo" etc.
    testimonials = normalizeReviewArray(testimonials);

    // Brochure handling (replace & delete old local file)
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
        path: `/uploads/brochures/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype,
      };
    }

    // If replacing Cloudinary images, delete old ones from Cloudinary
    if (images.length && product.images?.length) {
      for (const imgUrl of product.images) {
        const publicId = extractCloudinaryPublicId(imgUrl);
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(publicId);
          } catch (e) {
            console.warn(
              "Failed to delete old Cloudinary image for competition product:",
              e.message
            );
          }
        }
      }
    }

    // Assign fields
    Object.assign(product, {
      brand: req.body.brand || product.brand,
      model: req.body.model || product.model,
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
      brochureFile,
      reviews: reviews.length ? reviews : product.reviews,
      testimonials: testimonials.length ? testimonials : product.testimonials,

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
    return ok(res, product, "Competition product updated successfully");
  } catch (error) {
    console.error(error);
    return bad(res, "Failed to update competition product");
  }
};

// ---------- DELETE (like Product.remove, but with Cloudinary URL parsing) ----------
export const deleteCompetitionProduct = async (req, res) => {
  const item = await CompetitionProduct.findById(req.params.id);
  if (!item) return bad(res, "Not found", 404);

  // Delete images from Cloudinary (URLs)
  for (const imgUrl of item.images || []) {
    const publicId = extractCloudinaryPublicId(imgUrl);
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (e) {
        console.warn(
          "Failed to delete Cloudinary image for competition product:",
          e.message
        );
      }
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
  return ok(res, {}, "Competition product deleted");
};

// ---------- DOWNLOAD BROCHURE (like Product.downloadBrochure) ----------
export const downloadCompetitionBrochure = async (req, res) => {
  try {
    const product = await CompetitionProduct.findById(req.params.id);
    if (!product?.brochureFile?.path) {
      return res.status(404).send("Brochure not found");
    }

    // ----- FIX: absolute path handling -----
    let filePath = product.brochureFile.path;

    // If file path is not absolute, make it absolute
    if (!path.isAbsolute(filePath)) {
      filePath = path.join("/var/www/backend", filePath);
    }

    // Normalize slashes
    filePath = filePath.replace(/\\/g, "/");

    console.log("Brochure download path →", filePath);

    // Check file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("File does not exist on server: " + filePath);
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${
        product.brochureFile.originalName || "brochure.pdf"
      }"`
    );

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (err) {
    console.error("Competition brochure download error:", err);
    res.status(500).send("Server error");
  }
};

/**
 * ------------- EXISTING COMBINATION FILTER APIS -------------
 * Kept as-is (just using current models) so your comparison UI doesn't break
 */

// ---------- FILTER: simple Tata vs Competition by payload/fuel/category ----------
export const filterCompetitionAndRealProducts = async (req, res) => {
  try {
    const { payload, fuelType, category } = req.body || {};

    const payloadFilter = {};
    const fuelFilter = {};
    const categoryFilter = {};

    if (payload && payload !== "all")
      payloadFilter.payload = { $regex: payload, $options: "i" };
    if (fuelType && fuelType !== "all")
      fuelFilter.fuelType = { $regex: fuelType, $options: "i" };
    if (category && category !== "all")
      categoryFilter.category = { $regex: category, $options: "i" };

    const realProducts = await Product.find({
      ...payloadFilter,
      ...fuelFilter,
      ...categoryFilter,
    })
      .select(
        "title category payload fuelType price engine torque mileage cabinType images brochureFile"
      )
      .lean();

    const competitorProducts = await CompetitionProduct.find({
      ...payloadFilter,
      ...fuelFilter,
      ...categoryFilter,
    })
      .select(
        "brand model category payload fuelType price engine torque mileage cabinType images brochureFile"
      )
      .lean();

    return res.json({
      success: true,
      totalReal: realProducts.length,
      totalCompetitors: competitorProducts.length,
      data: { real: realProducts, competitors: competitorProducts },
    });
  } catch (err) {
    console.error("Compare filter error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error fetching comparison data" });
  }
};

/**
 * Unified Compare API
 * Filters both Tata products and competition products based on payload + price range + other filters
 */
export const filterProductsAndCompetition = async (req, res) => {
  try {
    const { application, fuelType, payload, priceRange } = req.body || {};

    // --- Parse Payload Range ---
    const parseRange = (str) => {
      if (!str || str === "all") return null;
      if (str.endsWith("+")) {
        const min = parseInt(str.replace("+", "").trim(), 10);
        return { min, max: null };
      }
      if (str.includes("-")) {
        const [a, b] = str.split("-");
        return { min: parseInt(a), max: parseInt(b) };
      }
      return null;
    };
    const payloadRange = parseRange(payload);

    // --- Parse Price Range ---
    const parsePrice = (str) => {
      if (!str || str === "all") return null;
      if (str.endsWith("+")) {
        const min = parseInt(str.replace("+", "").trim(), 10);
        return { min, max: null };
      }
      if (str.includes("-")) {
        const [a, b] = str.split("-");
        return { min: parseInt(a), max: parseInt(b) };
      }
      return null;
    };
    const priceRangeParsed = parsePrice(priceRange);

    // --- Build Text Filters ---
    const textFilters = {};
    if (application && application !== "all")
      textFilters.applicationSuitability = {
        $regex: application,
        $options: "i",
      };
    if (fuelType && fuelType !== "all")
      textFilters.fuelType = { $regex: fuelType, $options: "i" };

    // --- Get Tata Products ---
    const tataProducts = await Product.find({
      ...textFilters,
    }).lean();

    // --- Get Competitor Products ---
    const compProducts = await CompetitionProduct.find({
      ...textFilters,
    }).lean();

    // --- Helper to extract numeric value ---
    const toNumber = (v) => {
      if (!v) return 0;
      const s = String(v).replace(/[^\d.]/g, "");
      return parseFloat(s) || 0;
    };

    const filterByRange = (value, range) => {
      const num = toNumber(value);
      if (!range) return true;
      if (range.min && !range.max) return num >= range.min;
      if (range.min && range.max) return num >= range.min && num <= range.max;
      return true;
    };

    // --- Apply payload & price filters ---
    const filteredTata = tataProducts.filter(
      (p) =>
        filterByRange(p.payload, payloadRange) &&
        filterByRange(p.price, priceRangeParsed)
    );

    const filteredCompetitors = compProducts.filter(
      (p) =>
        filterByRange(p.payload, payloadRange) &&
        filterByRange(p.price, priceRangeParsed)
    );

    res.json({
      success: true,
      totalReal: filteredTata.length,
      totalCompetitors: filteredCompetitors.length,
      data: { real: filteredTata, competitors: filteredCompetitors },
    });
  } catch (err) {
    console.error("Unified compare error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while comparing products",
    });
  }
};
