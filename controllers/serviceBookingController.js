import ServiceBooking from "../models/ServiceBooking.js";
import { cloudinary } from "../utils/cloudinary.js";
import { ok, created, bad } from "../utils/response.js";

// ✅ Create booking
export const create = async (req, res) => {
  try {
    let attachment;
    console.log("FILE RECEIVED:", req.file);
    console.log("BODY:", req.body);
    if (req.file) {
      // upload to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "serviceBookings",
      });
      attachment = result.secure_url;
    }

    const booking = await ServiceBooking.create({
      ...req.body,
      pickupRequired: req.body.pickupRequired === "true",
      requestEstimate: req.body.requestEstimate === "true",
      attachment,
    });

    return created(res, booking, "Service booking created");
  } catch (e) {
    console.error("Booking create error:", e);
    return bad(res, e.message, 400);
  }
};

// ✅ Get all bookings
export const list = async (req, res) => {
  const items = await ServiceBooking.find().sort({ createdAt: -1 });
  return ok(res, items);
};

// ✅ Get single booking
export const get = async (req, res) => {
  const item = await ServiceBooking.findById(req.params.id);
  if (!item) return bad(res, "Not found", 404);
  return ok(res, item);
};

// ✅ Update booking
export const update = async (req, res) => {
  try {
    let update = { ...req.body };

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "serviceBookings",
      });
      update.attachment = result.secure_url;
    }

    const item = await ServiceBooking.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });

    if (!item) return bad(res, "Not found", 404);
    return ok(res, item, "Updated");
  } catch (e) {
    return bad(res, e.message, 400);
  }
};

// ✅ Delete booking
export const remove = async (req, res) => {
  try {
    const item = await ServiceBooking.findByIdAndDelete(req.params.id);
    if (!item) return bad(res, "Not found", 404);

    return ok(res, {}, "Deleted");
  } catch (e) {
    return bad(res, e.message, 500);
  }
};
