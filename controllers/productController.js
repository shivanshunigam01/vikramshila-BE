// controllers/productController.js
import Product from "../models/Product.js";
import { ok, created, bad } from "../utils/response.js";
import { cloudinary } from "../utils/cloudinary.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const create = async (req, res) => {
  try {
    // ✅ Ensure price is always string
    if (req.body.price !== undefined && req.body.price !== "") {
      req.body.price = String(req.body.price).trim();
    }

    // ✅ Product images (Cloudinary)
    const images = (req.files?.images || []).map((f) => f.path);

    // ✅ Reviews (Cloudinary)
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

    // ✅ Testimonials (Cloudinary)
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

    // ✅ Brochure (Local disk storage) - NEW IMPLEMENTATION
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

    // ✅ Create product with all fields from frontend
    const product = await Product.create({
      title: req.body.title || "",
      description: req.body.description || "",
      category: req.body.category || "",
      price: req.body.price || "",
      status: req.body.status || "active",

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
    });

    return res.status(201).json({ message: "Product created", product });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message });
  }
};

export const list = async (req, res) => {
  const { q } = req.query;
  const filter = q ? { title: new RegExp(q, "i") } : {};
  const items = await Product.find(filter).sort({ createdAt: -1 });
  return ok(res, items);
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

    // ✅ Brochure handling - NEW IMPLEMENTATION
    let brochureFile = product.brochureFile;
    if (req.files?.brochureFile && req.files.brochureFile[0]) {
      // Delete old brochure file if it exists
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

      // Set new brochure file
      const file = req.files.brochureFile[0];
      brochureFile = {
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
      };
    }

    // ✅ Assign all fields
    Object.assign(product, {
      title: req.body.title || product.title,
      description: req.body.description || product.description,
      category: req.body.category || product.category,
      price: req.body.price || product.price,
      status: req.body.status || product.status,

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
    const { application, fuelType, payload, priceRange } = req.body; // 👈 changed tonnage → payload

    let andConditions = [];

    // 🔹 Application filter
    if (application && application.toLowerCase() !== "all") {
      andConditions.push({
        applicationSuitability: { $regex: application, $options: "i" },
      });
    }

    // 🔹 Fuel Type filter
    if (fuelType && fuelType.toLowerCase() !== "all") {
      andConditions.push({ fuelType: { $regex: fuelType, $options: "i" } });
    }

    // 🔹 Payload filter
    if (payload && payload.toLowerCase() !== "all") {
      andConditions.push({ payload: { $regex: payload, $options: "i" } });
    }

    // 🔹 Price Range filter (expecting "100000 - 500000")
    if (priceRange && priceRange.toLowerCase() !== "all") {
      const parts = priceRange.split("-");
      if (parts.length === 2) {
        const [minStr, maxStr] = parts;
        const min = parseInt(minStr.trim(), 10);
        const max = parseInt(maxStr.trim(), 10);

        if (!isNaN(min) && !isNaN(max)) {
          andConditions.push({
            price: {
              $gte: min.toString(),
              $lte: max.toString(),
            },
          });
        }
      }
    }

    const filter = andConditions.length > 0 ? { $and: andConditions } : {};

    const products = await Product.find(filter).sort({ createdAt: -1 });

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
