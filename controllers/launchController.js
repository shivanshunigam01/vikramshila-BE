import Launch from "../models/Launch.js";
import { ok, bad } from "../utils/response.js";
import { cloudinary } from "../utils/cloudinary.js";
import fs from "fs";
import path from "path";

// 🔹 CREATE
export const create = async (req, res) => {
  try {
    // Cloudinary media files
    const mediaFiles = (req.files?.mediaFiles || []).map((f) => f.path);

    // Local brochure
    let brochureFile = null;
    if (req.files?.brochureFile && req.files.brochureFile[0]) {
      const file = req.files.brochureFile[0];
      brochureFile = {
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
      };
    }

    const doc = await Launch.create({
      ...req.body,
      mediaFiles,
      brochureFile,
    });

    return res.status(201).json({ message: "Launch created", launch: doc });
  } catch (e) {
    console.error(e);
    return bad(res, e.message, 400);
  }
};

// 🔹 LIST
export const list = async (req, res) => {
  const items = await Launch.find().sort({ createdAt: -1 });
  return ok(res, items);
};

// 🔹 GET
export const get = async (req, res) => {
  const item = await Launch.findById(req.params.id);
  if (!item) return bad(res, "Not found", 404);
  return ok(res, item);
};

// 🔹 UPDATE
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const launch = await Launch.findById(id);
    if (!launch) return bad(res, "Launch not found", 404);

    if (req.body.title) launch.title = req.body.title;
    if (req.body.description) launch.description = req.body.description;
    if (req.body.launchDate) launch.launchDate = req.body.launchDate;
    if (req.body.status) launch.status = req.body.status;

    // Replace media if new ones uploaded
    if (req.files?.mediaFiles?.length) {
      launch.mediaFiles = req.files.mediaFiles.map((f) => f.path);
    }

    // Replace brochure if uploaded
    if (req.files?.brochureFile && req.files.brochureFile[0]) {
      if (
        launch.brochureFile?.path &&
        fs.existsSync(launch.brochureFile.path)
      ) {
        try {
          fs.unlinkSync(launch.brochureFile.path);
        } catch (err) {
          console.warn("Failed to delete old brochure:", err.message);
        }
      }
      const file = req.files.brochureFile[0];
      launch.brochureFile = {
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
      };
    }

    await launch.save();
    return ok(res, launch, "Launch updated successfully");
  } catch (error) {
    console.error("Error updating launch:", error);
    return bad(res, "Failed to update launch", 400);
  }
};

// 🔹 DELETE
export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const launch = await Launch.findById(id);
    if (!launch) return bad(res, "Not found", 404);

    // Delete brochure file
    if (launch.brochureFile?.path && fs.existsSync(launch.brochureFile.path)) {
      try {
        fs.unlinkSync(launch.brochureFile.path);
      } catch (err) {
        console.warn("Failed to delete brochure:", err.message);
      }
    }

    // Delete Cloudinary media
    for (const media of launch.mediaFiles || []) {
      if (media.includes("cloudinary.com")) {
        const parts = media.split("/");
        const filename = parts[parts.length - 1];
        const publicId = filename.split(".")[0];

        let resourceType = "image";
        if (/\.(mp4|mov|avi|mkv)$/i.test(filename)) resourceType = "video";
        else if (/\.(pdf|docx?|pptx?|xlsx?|zip|rar)$/i.test(filename))
          resourceType = "raw";

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

// 🔹 DOWNLOAD BROCHURE
export const downloadBrochure = async (req, res) => {
  try {
    const launch = await Launch.findById(req.params.id);
    if (!launch?.brochureFile?.path) {
      return res.status(404).send("Brochure not found");
    }

    const filePath = path.resolve(launch.brochureFile.path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("File does not exist");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${
        launch.brochureFile.originalName || "brochure.pdf"
      }"`
    );

    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).send("Server error");
  }
};
