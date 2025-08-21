const Scheme = require("../models/Scheme");
const { ok, created, bad } = require("../utils/response");

exports.create = async (req, res) => {
  try {
    const photos = (req.files || []).map((f) =>
      f.path.replace(/.*uploads/, "uploads")
    );

    const scheme = await Scheme.create({
      ...req.body,
      photos,
    });

    return created(res, scheme, "Scheme created");
  } catch (e) {
    return bad(res, e.message, 400);
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

    if (req.files && req.files.length > 0) {
      update.photos = req.files.map((f) =>
        f.path.replace(/.*uploads/, "uploads")
      );
    }

    const item = await Scheme.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!item) return bad(res, "Not found", 404);

    return ok(res, item, "Updated");
  } catch (e) {
    return bad(res, e.message, 400);
  }
};

exports.remove = async (req, res) => {
  const item = await Scheme.findByIdAndDelete(req.params.id);
  if (!item) return bad(res, "Not found", 404);
  return ok(res, {}, "Deleted");
};
