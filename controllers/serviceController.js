import Service from "../models/Service.js";
import { ok, created, bad } from "../utils/response.js";
import { cloudinary } from "../utils/cloudinary.js";

export const create = async (req, res) => {
  try {
    let icon;

    if (req.file) {
      // Upload to cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "services",
        resource_type: "image",
      });
      icon = result.secure_url;
    }

    const doc = await Service.create({ ...req.body, icon });
    return created(res, doc, "Service created");
  } catch (e) {
    console.error("Service create error:", e);
    return bad(res, e.message, 400);
  }
};

export const list = async (req, res) => {
  const items = await Service.find().sort({ createdAt: -1 });
  return ok(res, items);
};

export const get = async (req, res) => {
  const item = await Service.findById(req.params.id);
  if (!item) return bad(res, "Not found", 404);
  return ok(res, item);
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);
    if (!service) return bad(res, "Not found", 404);

    // Update fields
    if (req.body.title) service.title = req.body.title;
    if (req.body.description) service.description = req.body.description;
    if (req.body.status) service.status = req.body.status;

    // If new file uploaded, replace icon in Cloudinary
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "services",
        resource_type: "image",
      });
      service.icon = result.secure_url;
    }

    await service.save();
    return ok(res, service, "Updated");
  } catch (e) {
    console.error("Service update error:", e);
    return bad(res, e.message, 400);
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);
    if (!service) return bad(res, "Not found", 404);

    // Optionally delete icon from Cloudinary
    if (service.icon && service.icon.includes("cloudinary.com")) {
      const parts = service.icon.split("/");
      const filename = parts[parts.length - 1];
      const publicId = `services/${filename.split(".")[0]}`;
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
      } catch (err) {
        console.warn("Cloudinary delete failed:", err.message);
      }
    }

    await service.deleteOne();
    return ok(res, {}, "Deleted");
  } catch (e) {
    console.error("Service delete error:", e);
    return bad(res, e.message || e, 500);
  }
};
