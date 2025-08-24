// controllers/productController.js
import Product from "../models/Product.js";
import { ok, created, bad } from "../utils/response.js";
import { cloudinary } from "../utils/cloudinary.js";

export const create = async (req, res) => {
  try {
    // ✅ Keep price as string directly
    if (req.body.price !== undefined && req.body.price !== "") {
      req.body.price = String(req.body.price).trim();
    } else {
      delete req.body.price;
    }

    // Rename name -> title
    if (req.body.name) {
      req.body.title = req.body.name;
      delete req.body.name;
    }

    // Images from Cloudinary
    const images = (req.files?.images || []).map((f) => f.path);

    // Brochure from local upload folder
    const brochureFile = req.files?.brochureFile
      ? req.files.brochureFile[0].path.replace(/.*uploads/, "/uploads")
      : undefined;

    const product = await Product.create({
      ...req.body,
      category: req.body.category, // ✅ passed from body
      images,
      brochureFile,
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

    // Update basic fields
    if (req.body.title) product.title = req.body.title;
    if (req.body.description) product.description = req.body.description;

    // ✅ keep price as string (like "3.99 Lakh")
    if (req.body.price !== undefined && req.body.price !== "") {
      product.price = String(req.body.price).trim();
    }

    // Handle images upload (Cloudinary → URL only)
    if (req.files?.images) {
      product.images = req.files.images.map((f) => f.path); // only URLs
    } else if (req.body.images) {
      // if frontend sends array of objects → extract URL
      try {
        const parsedImages = JSON.parse(req.body.images);
        product.images = parsedImages.map((img) =>
          typeof img === "string" ? img : img.url
        );
      } catch {
        // fallback if it's already array of strings
        product.images = Array.isArray(req.body.images)
          ? req.body.images
          : [req.body.images];
      }
    }

    // Handle brochure upload (local server path)
    if (req.files?.brochureFile) {
      product.brochureFile = req.files.brochureFile[0].path.replace(
        /.*uploads/,
        "/uploads"
      );
    }

    await product.save();
    return ok(res, "Product updated successfully", product);
  } catch (error) {
    console.error(error);
    return bad(res, "Failed to update product");
  }
};

export const remove = async (req, res) => {
  const item = await Product.findById(req.params.id);
  if (!item) return bad(res, "Not found", 404);

  // Delete media from Cloudinary
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
