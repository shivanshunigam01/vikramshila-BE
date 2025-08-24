import Launch from "../models/Launch.js";
import { ok, bad } from "../utils/response.js";
import { cloudinary } from "../utils/cloudinary.js";

export const create = async (req, res) => {
  try {
    const mediaFiles = (req.files || []).map((f) => f.path);
    const doc = await Launch.create({ ...req.body, mediaFiles });
    return res.status(201).json({ message: "Launch created", launch: doc });
  } catch (e) {
    console.error(e);
    return bad(res, e.message, 400);
  }
};

export const list = async (req, res) => {
  const items = await Launch.find().sort({ createdAt: -1 });
  return ok(res, items);
};

export const get = async (req, res) => {
  const item = await Launch.findById(req.params.id);
  if (!item) return bad(res, "Not found", 404);
  return ok(res, item);
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const launch = await Launch.findById(id);
    if (!launch) return bad(res, "Launch not found", 404);

    if (req.body.title) launch.title = req.body.title;
    if (req.body.description) launch.description = req.body.description;
    if (req.body.launchDate) launch.launchDate = req.body.launchDate;
    if (req.body.status) launch.status = req.body.status;

    // handle media updates
    if (req.files?.length) {
      launch.mediaFiles = req.files.map((f) => f.path);
    } else if (req.body.mediaFiles) {
      try {
        const parsed = JSON.parse(req.body.mediaFiles);
        launch.mediaFiles = parsed.map((m) =>
          typeof m === "string" ? m : m.url
        );
      } catch {
        launch.mediaFiles = Array.isArray(req.body.mediaFiles)
          ? req.body.mediaFiles
          : [req.body.mediaFiles];
      }
    }

    await launch.save();
    return ok(res, "Launch updated successfully", launch);
  } catch (error) {
    console.error("Error updating launch:", error);
    return bad(res, "Failed to update launch", 400);
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return bad(res, "Launch ID is required", 400);

    const launch = await Launch.findById(id);
    if (!launch) return bad(res, "Not found", 404);

    // 🔥 Delete media files from Cloudinary
    for (const media of launch.mediaFiles || []) {
      if (media.includes("cloudinary.com")) {
        const parts = media.split("/");
        const filename = parts[parts.length - 1];
        const publicId = filename.split(".")[0]; // remove extension

        // ✅ Detect resource type by extension
        let resourceType = "image"; // default
        if (/\.(mp4|mov|avi|mkv)$/i.test(filename)) {
          resourceType = "video";
        } else if (/\.(pdf|docx?|pptx?|xlsx?|zip|rar)$/i.test(filename)) {
          resourceType = "raw";
        }

        try {
          await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
          });
        } catch (err) {
          console.warn("Cloudinary delete failed:", err.message);
        }
      }
    }

    await launch.deleteOne();
    return ok(res, {}, "Deleted");
  } catch (e) {
    console.error("Launch delete error:", e);
    return bad(res, e.message || e, 500);
  }
};
