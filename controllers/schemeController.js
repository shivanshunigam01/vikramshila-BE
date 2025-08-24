const Scheme = require("../models/Scheme");
const { ok, created, bad } = require("../utils/response");

exports.create = async (req, res) => {
  try {
    // Map photos to Cloudinary URLs
    const photos = (req.files || []).map((f) => {
      // Cloudinary storage returns 'path' as URL, so keep it
      return f.path || f.location || f.url; // in case Cloudinary returns 'location'
    });

    const scheme = await Scheme.create({
      ...req.body,
      photos,
    });

    return created(res, scheme, "Scheme created");
  } catch (e) {
    console.error("Scheme create error:", e); // detailed log
    // send the full error object as JSON to debug
    return res.status(500).json({
      success: false,
      message: "Failed to create scheme",
      error: e.message || e,
    });
  }
};

exports.list = async (req, res) => {
  const items = await Scheme.find().sort({ createdAt: -1 });
  return ok(res, items);
};

exports.get = async (req, res) => {
  const item = await Scheme.findById(req.params.id);
  if (!item) return bad(res, "Not found", 404);
  return ok(res, item);
};

exports.update = async (req, res) => {
  try {
    const update = { ...req.body };

    // Update photos if files are uploaded
    if (req.files && req.files.length > 0) {
      update.photos = req.files.map((f) => f.path); // only URLs
    }

    const item = await Scheme.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!item) return bad(res, "Not found", 404);

    return ok(res, item, "Updated");
  } catch (e) {
    console.error(e);
    return bad(res, e.message, 400);
  }
};

exports.remove = async (req, res) => {
  const item = await Scheme.findByIdAndDelete(req.params.id);
  if (!item) return bad(res, "Not found", 404);
  return ok(res, {}, "Deleted");
};
