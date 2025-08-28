const Banner = require("../models/Banner");
const { cloudinary } = require("../utils/cloudinary");

exports.uploadBanner = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No image uploaded" });
    }

    const banner = new Banner({
      imageUrl: req.file.path, // Cloudinary URL
      publicId: req.file.filename,
    });

    await banner.save();

    res.status(201).json({
      success: true,
      message: "Banner uploaded successfully",
      data: banner,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error uploading banner",
      error: error.message,
    });
  }
};

exports.getBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: banners,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching banners",
      error: error.message,
    });
  }
};

// Delete banner by ID
exports.deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findById(id);
    if (!banner) {
      return res
        .status(404)
        .json({ success: false, message: "Banner not found" });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(banner.publicId);

    // Delete from DB
    await banner.deleteOne();

    res
      .status(200)
      .json({ success: true, message: "Banner deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting banner",
      error: error.message,
    });
  }
};
