const Launch = require("../models/Launch");
const RR = require("../utils/response");

exports.create = async (req, res) => {
  try {
    const mediaFiles = (req.files || []).map((f) => f.path.replace(/.*uploads/, "uploads"));
    const doc = await Launch.create({ ...req.body, mediaFiles });
    return RR.created(res, doc, "Launch created");
  } catch (e) { return RR.bad(res, e.message, 400); }
};

exports.list = async (req, res) => {
  const items = await Launch.find().sort({ createdAt: -1 });
  return RR.ok(res, items);
};

exports.get = async (req, res) => {
  const item = await Launch.findById(req.params.id);
  if (!item) return RR.bad(res, "Not found", 404);
  return RR.ok(res, item);
};

exports.update = async (req, res) => {
  try {
    const update = { ...req.body };
    if (req.files?.length) update.mediaFiles = req.files.map((f) => f.path.replace(/.*uploads/, "uploads"));
    const item = await Launch.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!item) return RR.bad(res, "Not found", 404);
    return RR.ok(res, item, "Updated");
  } catch (e) { return RR.bad(res, e.message, 400); }
};

exports.remove = async (req, res) => {
  const item = await Launch.findByIdAndDelete(req.params.id);
  if (!item) return RR.bad(res, "Not found", 404);
  return RR.ok(res, {}, "Deleted");
};
