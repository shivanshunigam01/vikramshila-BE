import Product from "../models/Product.js";
import { ok, created, bad } from "../utils/response.js";

export const create = async (req, res) => {
  try {
    if (req.body.price !== undefined && req.body.price !== "") {
      const parsedPrice = Number(req.body.price);
      if (isNaN(parsedPrice)) {
        return res.status(400).json({ error: "Price must be a valid number" });
      }
      req.body.price = parsedPrice;
    } else {
      delete req.body.price;
    }

    if (req.body.name) {
      req.body.title = req.body.name;
      delete req.body.name;
    }

    const images = (req.files?.images || []).map((f) =>
      f.path.replace(/.*uploads/, "uploads")
    );
    const brochureFile = req.files?.brochure
      ? req.files.brochure[0].path.replace(/.*uploads/, "uploads")
      : undefined;

    const product = await Product.create({
      ...req.body,
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
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (req.body.title) product.title = req.body.title;
    if (req.body.description) product.description = req.body.description;

    if (req.body.price !== undefined && req.body.price !== "") {
      const parsedPrice = Number(req.body.price);
      if (isNaN(parsedPrice)) {
        return res.status(400).json({ error: "Price must be a valid number" });
      }
      product.price = parsedPrice;
    }

    if (req.files?.images) {
      product.images = req.files.images.map((f) =>
        f.path.replace(/.*uploads/, "uploads")
      );
    }

    if (req.files?.brochure) {
      product.brochureFile = req.files.brochure[0].path.replace(
        /.*uploads/,
        "uploads"
      );
    }

    await product.save();
    res.json({ message: "Product updated successfully", product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const remove = async (req, res) => {
  const item = await Product.findByIdAndDelete(req.params.id);
  if (!item) return bad(res, "Not found", 404);
  return ok(res, {}, "Deleted");
};
