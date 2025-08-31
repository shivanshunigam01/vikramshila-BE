const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary } = require("../utils/cloudinary"); // ✅ make sure utils/cloudinary.js is set up
const path = require("path");
const fs = require("fs");

// ================= Product Media Upload =================
// Images (Cloudinary)
const productImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "products",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
    transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
  },
});

const genericStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: "attachments", // you can change folder name
      resource_type: "auto", // auto => supports images, videos, pdf, docs
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`, // unique name
    };
  },
});

const uploadSingle = (fieldName) =>
  multer({ storage: genericStorage }).single(fieldName);
// Brochure (Local disk storage)
const brochureDiskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dest = path.join(__dirname, "../uploads/brochures");
    fs.mkdirSync(dest, { recursive: true }); // ensure folder exists
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  },
}); // ================= Product Media Upload =================
const productMediaStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = "products"; // default
    if (file.fieldname.startsWith("reviewFiles")) folder = "reviews";
    if (file.fieldname.startsWith("testimonialFiles")) folder = "testimonials";

    return {
      folder,
      resource_type: "auto", // ✅ auto handles images + videos
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
    };
  },
});

const uploadProductMedia = multer({ storage: productMediaStorage }).fields([
  { name: "images", maxCount: 10 },
  { name: "reviewFiles", maxCount: 10 },
  { name: "testimonialFiles", maxCount: 10 },
  { name: "brochureFile", maxCount: 1 }, // stays local if you want, else switch to Cloudinary
]);

// ================= Scheme Media Upload =================
const schemeImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "schemes",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
    transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
  },
});
const uploadSchemeImages = multer({ storage: schemeImageStorage });

// ================= Testimonial Media Upload =================
const testimonialStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "testimonials",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
  },
});
const uploadTestimonialImages = multer({ storage: testimonialStorage });

// ================= Launch Media Upload =================
const launchStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "launch",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "mp4", "mov"],
    resource_type: "auto", // ✅ supports images & videos
  },
});
const uploadLaunchMedia = multer({ storage: launchStorage });

// ================= Service Icons Upload =================
const serviceIconStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "services",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "svg"],
    transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
  },
});
const uploadServiceIcons = multer({ storage: serviceIconStorage });

// ================= Misc Upload =================
const miscStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "misc",
    allowed_formats: ["jpg", "jpeg", "png", "pdf", "webp"],
    resource_type: "auto", // ✅ supports both docs & images
  },
});
const uploadMisc = multer({ storage: miscStorage });

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "banners", // Cloudinary folder name
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

const upload = multer({ storage });

// ================= EXPORTS =================
module.exports = {
  uploadProductMedia,
  uploadSchemeImages,
  uploadTestimonialImages,
  uploadLaunchMedia,
  uploadServiceIcons,
  uploadMisc,
  uploadSingle,
  upload,
};
