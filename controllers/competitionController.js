import CompetitionProduct from "../models/CompetitionProduct.js";
import Product from "../models/Product.js";
import { cloudinary } from "../utils/cloudinary.js";
import fs from "fs";

// ---------- Helpers ----------
const toArray = (v) =>
  Array.isArray(v) ? v.filter(Boolean) : [v].filter(Boolean);

const toDriverComfort = (v) => {
  const n = Number(v);
  return isFinite(n) ? Math.max(0, Math.min(10, n)) : undefined;
};

// ---------- CREATE ----------
export const createCompetitionProduct = async (req, res) => {
  try {
    // FILES
    const imgFiles = req.files?.images || req.files?.image || [];
    const brochureField = req.files?.brochureFile || req.files?.brochure || [];

    const images = imgFiles.map((f) => f.path);

    const brochure =
      brochureField && brochureField[0]
        ? {
            filename: brochureField[0].filename,
            originalName: brochureField[0].originalname,
            path: brochureField[0].path,
            size: brochureField[0].size,
            mimetype: brochureField[0].mimetype,
          }
        : null;

    // REVIEWS + TESTIMONIALS
    const reviews = [];
    if (req.body.reviews) {
      Object.keys(req.body.reviews).forEach((i) => {
        reviews.push({
          type: req.body.reviews[i].type,
          content: req.body.reviews[i].content,
          rating: req.body.reviews[i].rating,
          customerName: req.body.reviews[i].customerName,
          customerLocation: req.body.reviews[i].customerLocation,
          file: req.body.reviews[i].file || "",
        });
      });
    }

    const testimonials = [];
    if (req.body.testimonials) {
      Object.keys(req.body.testimonials).forEach((i) => {
        testimonials.push({
          type: req.body.testimonials[i].type,
          content: req.body.testimonials[i].content,
          customerName: req.body.testimonials[i].customerName,
          customerLocation: req.body.testimonials[i].customerLocation,
          customerDesignation: req.body.testimonials[i].customerDesignation,
          file: req.body.testimonials[i].file || "",
        });
      });
    }

    const product = await CompetitionProduct.create({
      // NEW FIELD
      title: req.body.title,

      // OLD FIELDS
      brand: req.body.brand,
      model: req.body.model,
      description: req.body.description,
      category: req.body.category,
      seatAvailability: req.body.seatAvailability,
      mileage: req.body.mileage,
      tyreLife: req.body.tyreLife,
      tyresCost: req.body.tyresCost,
      freightRate: req.body.freightRate,
      price: req.body.price,
      gvw: req.body.gvw,
      engine: req.body.engine,
      fuelType: req.body.fuelType,
      fuelTankCapacity: req.body.fuelTankCapacity,
      gearBox: req.body.gearBox,
      clutchDia: req.body.clutchDia,
      torque: req.body.torque,
      tyre: req.body.tyre,
      cabinType: req.body.cabinType,
      warranty: req.body.warranty,
      applicationSuitability: req.body.applicationSuitability,
      payload: req.body.payload,
      deckWidth: toArray(req.body.deckWidth),
      deckLength: toArray(req.body.deckLength),
      bodyDimensions: req.body.bodyDimensions,
      tco: req.body.tco,
      profitMargin: req.body.profitMargin,
      usp: toArray(req.body.usp),
      monitoringFeatures: toArray(req.body.monitoringFeatures),
      driverComfort: toDriverComfort(req.body.driverComfort),

      // MEDIA
      images,
      brochureFile: brochure,

      // REVIEWS + TESTIMONIALS
      reviews,
      testimonials,

      newLaunch: req.body.newLaunch ? 1 : 0,
    });

    res.status(201).json({
      success: true,
      message: "Competition Product Created",
      data: product,
    });
  } catch (err) {
    console.error("Create error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- GET ALL ----------
export const getCompetitionProducts = async (req, res) => {
  try {
    const items = await CompetitionProduct.find().lean();

    const normalized = items.map((p) => ({
      _id: p._id,
      title: p.title || p.model,
      category: p.category,
      description: p.description,
      price: p.price,
      payload: p.payload,
      engine: p.engine,
      fuelType: p.fuelType,
      gearBox: p.gearBox,
      clutchDia: p.clutchDia,
      torque: p.torque,
      tyre: p.tyre,
      mileage: p.mileage,
      fuelTankCapacity: p.fuelTankCapacity,
      cabinType: p.cabinType,
      warranty: p.warranty,
      monitoringFeatures: p.monitoringFeatures,
      driverComfort: p.driverComfort,
      images: p.images,
      brochureFile: p.brochureFile,
      brand: p.brand,
      type: "Competitor",
    }));

    res.json({ success: true, data: normalized });
  } catch (err) {
    console.error("Error fetching competition products:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ---------- UPDATE ----------
export const updateCompetitionProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await CompetitionProduct.findById(id);
    if (!existing)
      return res.status(404).json({ success: false, message: "Not found" });

    const imgFiles = req.files?.images || [];
    const brochureField = req.files?.brochureFile || [];

    const images = imgFiles.map((f) => f.path);

    // Replace brochure
    let brochureFile = existing.brochureFile;
    if (brochureField && brochureField[0]) {
      try {
        if (
          existing.brochureFile?.path &&
          fs.existsSync(existing.brochureFile.path)
        ) {
          fs.unlinkSync(existing.brochureFile.path);
        }
      } catch {}
      const bf = brochureField[0];
      brochureFile = {
        filename: bf.filename,
        originalName: bf.originalname,
        path: bf.path,
        size: bf.size,
        mimetype: bf.mimetype,
      };
    }

    // Append reviews
    let reviews = existing.reviews;
    if (req.body.reviews) {
      reviews = [];
      Object.keys(req.body.reviews).forEach((i) => {
        reviews.push(req.body.reviews[i]);
      });
    }

    // Append testimonials
    let testimonials = existing.testimonials;
    if (req.body.testimonials) {
      testimonials = [];
      Object.keys(req.body.testimonials).forEach((i) => {
        testimonials.push(req.body.testimonials[i]);
      });
    }

    Object.assign(existing, {
      title: req.body.title || existing.title,
      brand: req.body.brand || existing.brand,
      model: req.body.model || existing.model,
      description: req.body.description || existing.description,
      category: req.body.category || existing.category,
      mileage: req.body.mileage || existing.mileage,
      price: req.body.price || existing.price,
      payload: req.body.payload || existing.payload,
      engine: req.body.engine || existing.engine,
      fuelType: req.body.fuelType || existing.fuelType,
      gearBox: req.body.gearBox || existing.gearBox,
      torque: req.body.torque || existing.torque,
      tyre: req.body.tyre || existing.tyre,
      cabinType: req.body.cabinType || existing.cabinType,
      warranty: req.body.warranty || existing.warranty,
      applicationSuitability:
        req.body.applicationSuitability || existing.applicationSuitability,
      bodyDimensions: req.body.bodyDimensions || existing.bodyDimensions,
      monitoringFeatures: toArray(req.body.monitoringFeatures),
      driverComfort:
        req.body.driverComfort !== undefined
          ? toDriverComfort(req.body.driverComfort)
          : existing.driverComfort,
      images: images.length ? images : existing.images,
      brochureFile,
      reviews,
      testimonials,
    });

    await existing.save();

    res.json({
      success: true,
      message: "Competition Product Updated",
      data: existing,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error updating product" });
  }
};

// ---------- DELETE ----------
export const deleteCompetitionProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await CompetitionProduct.findById(id);
    if (!item)
      return res.status(404).json({ success: false, message: "Not found" });

    if (item.brochureFile?.path && fs.existsSync(item.brochureFile.path)) {
      try {
        fs.unlinkSync(item.brochureFile.path);
      } catch {}
    }

    await item.deleteOne();
    res.json({ success: true, message: "Competition Product Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting product" });
  }
};

// ---------- GET BY ID ----------
export const getCompetitionProductById = async (req, res) => {
  try {
    const product = await CompetitionProduct.findById(req.params.id).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Competitor product not found",
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (err) {
    console.error("Error fetching competitor product:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch competitor product",
      error: err.message,
    });
  }
};

export const downloadCompetitionBrochure = async (req, res) => {
  try {
    const product = await CompetitionProduct.findById(req.params.id);
    if (!product?.brochureFile?.path) {
      return res.status(404).json({ error: "Brochure not found" });
    }

    if (!fs.existsSync(product.brochureFile.path)) {
      return res.status(404).json({ error: "File not found on server" });
    }

    res.setHeader(
      "Content-Type",
      product.brochureFile.mimetype || "application/pdf"
    );
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${
        product.brochureFile.originalName || "brochure.pdf"
      }"`
    );

    const stream = fs.createReadStream(product.brochureFile.path);
    stream.pipe(res);
  } catch (err) {
    console.error("Brochure download error:", err);
    res.status(500).json({ error: "Failed to access brochure" });
  }
};
