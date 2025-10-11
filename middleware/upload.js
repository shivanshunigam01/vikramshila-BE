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
// ================= Lead KYC Upload (Aadhaar & PAN) =================
const leadKycUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // allow images & pdfs; tighten this if you want
    const ok =
      file.mimetype.startsWith("image/") || file.mimetype === "application/pdf";
    if (!ok) return cb(new Error("Only images or PDF are allowed"), false);
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file (adjust as needed)
  },
}).fields([
  { name: "aadharFile", maxCount: 1 },
  { name: "panCardFile", maxCount: 1 },
]);

const uploadLeadKyc = (req, res, next) => {
  leadKycUpload(req, res, async (err) => {
    if (err) return next(err);

    try {
      const kycFields = ["aadharFile", "panCardFile"];

      for (const fieldName of kycFields) {
        if (req.files?.[fieldName]?.length) {
          const file = req.files[fieldName][0];

          await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: "leads/kyc", // folder name in Cloudinary
                resource_type: "auto", // allow images & pdf
                public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
              },
              (error, result) => {
                if (error) return reject(error);
                // mutate multer file object so controller can read
                file.path = result.secure_url;
                file.public_id = result.public_id;
                file.mimetype = file.mimetype; // preserve
                resolve(result);
              }
            );
            uploadStream.end(file.buffer);
          });
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
const launchUpload = multer({
  storage: multer.memoryStorage(),
}).fields([
  { name: "mediaFiles", maxCount: 10 },
  { name: "brochureFile", maxCount: 1 },
]);

const uploadLaunchMedia = (req, res, next) => {
  launchUpload(req, res, async (err) => {
    if (err) return next(err);

    try {
      // 🔹 Cloudinary upload for media files
      if (req.files?.mediaFiles) {
        const uploadPromises = req.files.mediaFiles.map((file) => {
          return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: "launch",
                resource_type: "auto",
                public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
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

      // 🔹 Local disk upload for brochure
      if (req.files?.brochureFile && req.files.brochureFile[0]) {
        const brochureFile = req.files.brochureFile[0];
        const uploadsDir = path.join(__dirname, "../uploads/brochures");
        fs.mkdirSync(uploadsDir, { recursive: true });

        const ext = path.extname(brochureFile.originalname);
        const filename = `${Date.now()}-launch-brochure${ext}`;
        const filepath = path.join(uploadsDir, filename);

        fs.writeFileSync(filepath, brochureFile.buffer);

        brochureFile.filename = filename;
        brochureFile.path = filepath;
      }

      next();
    } catch (error) {
      next(error);
    }
  });
};

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
// DSE Photo Upload (Cloudinary)  =========================
const dsePhotoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "dse-photos",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 800, height: 800, crop: "limit" }],
    resource_type: "image",
  },
});

const uploadDsePhoto = multer({ storage: dsePhotoStorage }).single("photo");

const upload = multer({ storage });

// === Client Visit Photo (Cloudinary, folder: client-visits) ===
const clientVisitStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "client-visits",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
    resource_type: "image",
  },
});
const uploadClientVisitPhoto = multer({ storage: clientVisitStorage }).single(
  "photo"
);

// ================= Competition Product Upload =================
const competitionUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // ✅ Accept only images and PDFs
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only image and PDF files are allowed"), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit per file
}).fields([
  { name: "images", maxCount: 5 }, // ✅ matches frontend
  { name: "brochureFile", maxCount: 1 }, // ✅ matches frontend
]);

const uploadCompetitionMedia = (req, res, next) => {
  competitionUpload(req, res, async (err) => {
    if (err) return next(err);

    try {
      // ✅ Upload product images to Cloudinary
      if (req.files?.images) {
        const uploadPromises = req.files.images.map((file) => {
          return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: "competition",
                resource_type: "auto",
                public_id: `${Date.now()}-${file.originalname
                  .split(".")[0]
                  .replace(/\s+/g, "_")}`,
              },
              (error, result) => {
                if (error) reject(error);
                else {
                  // Mutate file object for controller use
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

      // ✅ Save brochure locally (PDF only)
      if (req.files?.brochureFile && req.files.brochureFile[0]) {
        const brochureFile = req.files.brochureFile[0];
        const uploadsDir = path.join(__dirname, "../uploads/brochures");
        fs.mkdirSync(uploadsDir, { recursive: true });

        const ext = path.extname(brochureFile.originalname);
        const filename = `${Date.now()}-competition-brochure${ext}`;
        const filepath = path.join(uploadsDir, filename);

        // Save PDF to disk
        fs.writeFileSync(filepath, brochureFile.buffer);

        // Mutate file object for controller
        brochureFile.filename = filename;
        brochureFile.path = filepath;
      }

      next();
    } catch (error) {
      next(error);
    }
  });
};
// ================= EXPORTS =================
module.exports = {
  uploadSchemeImages,
  uploadTestimonialImages,
  uploadLaunchMedia,
  uploadServiceIcons,
  uploadMisc,
  uploadSingle,
  upload,
  uploadProductMedia: handleMixedUpload,
  uploadLeadKyc,
  uploadDsePhoto,
  uploadClientVisitPhoto,
  uploadCompetitionMedia,
};
