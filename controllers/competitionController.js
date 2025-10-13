import CompetitionProduct from "../models/CompetitionProduct.js";
import Product from "../models/Product.js";
import { cloudinary } from "../utils/cloudinary.js";
import fs from "fs";
import path from "path";

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
    // ✅ Normalize file field names
    const imgFiles = req.files?.images || req.files?.image || [];
    const brochureField = req.files?.brochureFile || req.files?.brochure || [];

    // ✅ Extract uploaded image URLs
    const images = imgFiles.map((f) => f.path);

    // ✅ Brochure stored locally
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

    const product = await CompetitionProduct.create({
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
      images,
      brochureFile: brochure,
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
      title: p.model || p.title,
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

    const imgFiles = req.files?.images || req.files?.image || [];
    const brochureField = req.files?.brochureFile || req.files?.brochure || [];

    // ✅ New Cloudinary images
    const images = imgFiles.map((f) => f.path);

    // ✅ Brochure: delete old + replace
    let brochureFile = existing.brochureFile;
    if (brochureField && brochureField[0]) {
      if (
        existing.brochureFile?.path &&
        fs.existsSync(existing.brochureFile.path)
      ) {
        try {
          fs.unlinkSync(existing.brochureFile.path);
        } catch (err) {
          console.warn("Failed to delete old brochure:", err.message);
        }
      }
      const file = brochureField[0];
      brochureFile = {
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
      };
    }

    // ✅ If replacing Cloudinary images, remove old ones
    if (images.length && existing.images?.length) {
      for (const img of existing.images) {
        if (img.public_id) {
          try {
            await cloudinary.uploader.destroy(img.public_id);
          } catch (e) {
            console.warn("Failed to delete old Cloudinary image:", e.message);
          }
        }
      }
    }

    Object.assign(existing, {
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

    // ✅ Delete brochure from disk
    if (item.brochureFile?.path && fs.existsSync(item.brochureFile.path)) {
      try {
        fs.unlinkSync(item.brochureFile.path);
      } catch (err) {
        console.warn("Failed to delete brochure:", err.message);
      }
    }

    // ✅ Delete images from Cloudinary (if any)
    for (const img of item.images || []) {
      if (img.public_id) {
        try {
          await cloudinary.uploader.destroy(img.public_id);
        } catch (e) {
          console.warn("Failed to delete Cloudinary image:", e.message);
        }
      }
    }

    await item.deleteOne();
    res.json({ success: true, message: "Competition Product Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting product" });
  }
};

// ---------- FILTER ----------
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

