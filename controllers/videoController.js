const Video = require("../models/Video");

// Create
exports.createVideo = async (req, res) => {
  try {
    const { title, description, videoUrl, status } = req.body;

    const video = await Video.create({
      title,
      description,
      videoUrl,
      status: status || "pending",
    });

    return res.status(201).json({ success: true, data: video });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// List with pagination
exports.listVideos = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const [items, count] = await Promise.all([
      Video.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Video.countDocuments(),
    ]);

    return res.json({
      success: true,
      data: items,
      pagination: {
        page,
        pages: Math.ceil(count / limit),
        total: count,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// Get by id
exports.getVideoById = async (req, res) => {
  try {
    const item = await Video.findById(req.params.id);
    if (!item)
      return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, data: item });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// Update
exports.updateVideo = async (req, res) => {
  try {
    const { title, description, videoUrl, status } = req.body;
    const item = await Video.findByIdAndUpdate(
      req.params.id,
      { title, description, videoUrl, status },
      { new: true }
    );
    if (!item)
      return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, data: item });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// Delete
exports.deleteVideo = async (req, res) => {
  try {
    const item = await Video.findByIdAndDelete(req.params.id);
    if (!item)
      return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, message: "Deleted" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
