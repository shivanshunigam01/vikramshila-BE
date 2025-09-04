const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary } = require("../utils/cloudinary");
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
      folder: "attachments",
      resource_type: "auto",
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
    };
  },
});

const uploadSingle = (fieldName) =>
  multer({ storage: genericStorage }).single(fieldName);

// ✅ NEW: Brochure (Local disk storage)
const brochureDiskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dest = path.join(__dirname, "../uploads/brochures");
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${file.fieldname}${ext}`;
    cb(null, filename);
  },
});

// ✅ Reviews and Testimonials (Cloudinary)
const productMediaStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = "products";
    if (file.fieldname.startsWith("reviewFiles")) folder = "reviews";
    if (file.fieldname.startsWith("testimonialFiles")) folder = "testimonials";

    return {
      folder,
      resource_type: "auto",
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
    };
  },
});

// ✅ NEW: Mixed upload - Cloudinary for media, Local for brochures
const uploadProductMedia = multer({
  storage: multer.memoryStorage(), // We'll handle storage per field
  fileFilter: (req, file, cb) => {
    // Allow all file types for now
    cb(null, true);
  },
}).fields([
  { name: "images", maxCount: 10 },
  { name: "reviewFiles", maxCount: 10 },
  { name: "testimonialFiles", maxCount: 10 },
  { name: "brochureFile", maxCount: 1 },
]);

// ✅ Custom middleware to handle mixed storage
const handleMixedUpload = (req, res, next) => {
  uploadProductMedia(req, res, async (err) => {
    if (err) return next(err);

    try {
      // Handle Cloudinary uploads (images, reviews, testimonials)
      if (req.files) {
        const cloudinaryFields = ["images", "reviewFiles", "testimonialFiles"];

        for (const fieldName of cloudinaryFields) {
          if (req.files[fieldName]) {
            const uploadPromises = req.files[fieldName].map((file) => {
              return new Promise((resolve, reject) => {
                let folder = "products";
                if (fieldName === "reviewFiles") folder = "reviews";
                if (fieldName === "testimonialFiles") folder = "testimonials";

                const uploadStream = cloudinary.uploader.upload_stream(
                  {
                    folder,
                    resource_type: "auto",
                    public_id: `${Date.now()}-${
                      file.originalname.split(".")[0]
                    }`,
                  },
                  (error, result) => {
                    if (error) reject(error);
                    else {
                      file.path = result.secure_url;
                      file.public_id = result.public_id;
                      resolve(result);
                    }
                  }
                );
                uploadStream.end(file.buffer);
              });
            });

            await Promise.all(uploadPromises);
          }
        }

        // Handle local brochure upload
        if (req.files.brochureFile && req.files.brochureFile[0]) {
          const brochureFile = req.files.brochureFile[0];
          const uploadsDir = path.join(__dirname, "../uploads/brochures");

          // Ensure directory exists
          fs.mkdirSync(uploadsDir, { recursive: true });

          const ext = path.extname(brochureFile.originalname);
          const filename = `${Date.now()}-brochure${ext}`;
          const filepath = path.join(uploadsDir, filename);

          // Write file to disk
          fs.writeFileSync(filepath, brochureFile.buffer);

          // Update file object
          brochureFile.filename = filename;
          brochureFile.path = filepath;
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  });
};

// ================= Other Storage Configurations =================
// Scheme Media Upload
const schemeImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "schemes",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
    transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
  },
});
const uploadSchemeImages = multer({ storage: schemeImageStorage });

// Testimonial Media Upload
const testimonialStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "testimonials",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
  },
});
const uploadTestimonialImages = multer({ storage: testimonialStorage });

// Launch Media Upload
const launchStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "launch",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "mp4", "mov"],
    resource_type: "auto",
  },
});
const uploadLaunchMedia = multer({ storage: launchStorage });

// Service Icons Upload
const serviceIconStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "services",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "svg"],
    transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
  },
});
const uploadServiceIcons = multer({ storage: serviceIconStorage });

// Misc Upload
const miscStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "misc",
    allowed_formats: ["jpg", "jpeg", "png", "pdf", "webp"],
    resource_type: "auto",
  },
});
const uploadMisc = multer({ storage: miscStorage });

// Banner Upload
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "banners",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});
const upload = multer({ storage });

// ================= EXPORTS =================
module.exports = {
  uploadProductMedia: handleMixedUpload, // ✅ Updated to use mixed upload
  uploadSchemeImages,
  uploadTestimonialImages,
  uploadLaunchMedia,
  uploadServiceIcons,
  uploadMisc,
  uploadSingle,
  upload,
};
