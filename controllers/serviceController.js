const Service = require("../models/Service");
const Resp = require("../utils/response");

exports.create = async (req, res) => {
  try {
    const icon = req.file ? req.file.path.replace(/.*uploads/, "uploads") : undefined;
    const doc = await Service.create({ ...req.body, icon });
    return Resp.created(res, doc, "Service created");
  } catch (e) { return Resp.bad(res, e.message, 400); }
};

exports.list = async (req, res) => {
  const items = await Service.find().sort({ createdAt: -1 });
  return Resp.ok(res, items);
};

exports.get = async (req, res) => {
  const item = await Service.findById(req.params.id);
  if (!item) return Resp.bad(res, "Not found", 404);
  return Resp.ok(res, item);
};

exports.update = async (req, res) => {
  try {
    const update = { ...req.body };
    if (req.file) update.icon = req.file.path.replace(/.*uploads/, "uploads");
    const item = await Service.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!item) return Resp.bad(res, "Not found", 404);
    return Resp.ok(res, item, "Updated");
  } catch (e) { return Resp.bad(res, e.message, 400); }
};

exports.remove = async (req, res) => {
  const item = await Service.findByIdAndDelete(req.params.id);
  if (!item) return Resp.bad(res, "Not found", 404);
  return Resp.ok(res, {}, "Deleted");
};
