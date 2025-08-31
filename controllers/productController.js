// controllers/productController.js
import Product from "../models/Product.js";
import { ok, created, bad } from "../utils/response.js";
import { cloudinary } from "../utils/cloudinary.js";

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

    // ✅ Brochure (Cloudinary OR local)
    const brochureFile = req.files?.brochureFile
      ? req.files.brochureFile[0].path
      : undefined;

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

    const brochureFile = req.files?.brochureFile
      ? req.files.brochureFile[0].path
      : product.brochureFile;

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

  // Optional: Delete images from Cloudinary if you stored public_id
  for (const img of item.images || []) {
    if (img.public_id) {
      await cloudinary.uploader.destroy(img.public_id);
    }
  }

  if (item.brochureFile?.public_id) {
    await cloudinary.uploader.destroy(item.brochureFile.public_id, {
      resource_type: "raw",
    });
  }

  await item.deleteOne();
  return ok(res, {}, "Deleted");
};
