const Testimonial = require("../models/Testimonial");
const R = require("../utils/response");

exports.create = async (req, res) => {
  try {
    const image = req.file ? req.file.path.replace(/.*uploads/, "uploads") : undefined;
    const doc = await Testimonial.create({ ...req.body, image });
    return R.created(res, doc, "Testimonial created");
  } catch (e) { return R.bad(res, e.message, 400); }
};

exports.list = async (req, res) => {
  const items = await Testimonial.find().sort({ createdAt: -1 });
  return R.ok(res, items);
};

exports.get = async (req, res) => {
  const item = await Testimonial.findById(req.params.id);
  if (!item) return R.bad(res, "Not found", 404);
  return R.ok(res, item);
};

exports.update = async (req, res) => {
  try {
    const update = { ...req.body };
    if (req.file) update.image = req.file.path.replace(/.*uploads/, "uploads");
    const item = await Testimonial.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!item) return R.bad(res, "Not found", 404);
    return R.ok(res, item, "Updated");
  } catch (e) { return R.bad(res, e.message, 400); }
};

exports.remove = async (req, res) => {
  const item = await Testimonial.findByIdAndDelete(req.params.id);
  if (!item) return R.bad(res, "Not found", 404);
  return R.ok(res, {}, "Deleted");
};
