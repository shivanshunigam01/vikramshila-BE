import Testimonial from "../models/Testimonial.js";
import * as R from "../utils/response.js";

// Create testimonial
export const create = async (req, res) => {
  try {
    const image = req.file
      ? req.file.path.replace(/.*uploads/, "uploads")
      : undefined;
    const doc = await Testimonial.create({ ...req.body, image });
    return R.created(res, doc, "Testimonial created");
  } catch (e) {
    return R.bad(res, e.message, 400);
  }
};

// List testimonials
export const list = async (req, res) => {
  const items = await Testimonial.find().sort({ createdAt: -1 });
  return R.ok(res, items);
};

// Get testimonial by ID
export const get = async (req, res) => {
  const item = await Testimonial.findById(req.params.id);
  if (!item) return R.bad(res, "Not found", 404);
  return R.ok(res, item);
};

// Update testimonial
export const update = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await Testimonial.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      });
    }

    res.json({
      success: true,
      message: "Testimonial updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating testimonial:", error);
    res.status(400).json({
      success: false,
      message: "Error updating testimonial",
      error: error.message,
    });
  }
};

// Delete testimonial
export const remove = async (req, res) => {
  const item = await Testimonial.findByIdAndDelete(req.params.id);
  if (!item) return R.bad(res, "Not found", 404);
  return R.ok(res, {}, "Deleted");
};
