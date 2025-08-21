const multer = require("multer");
const path = require("path");

const makeStorage = (folder) =>
  multer.diskStorage({
    destination: (req, file, cb) =>
      cb(null, path.join(__dirname, "..", "uploads", folder)),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext).replace(/\s+/g, "-");
      cb(null, `${base}-${Date.now()}${ext}`);
    },
  });

const imageFilter = (req, file, cb) => {
  if (/^image\//.test(file.mimetype)) return cb(null, true);
  cb(new Error("Only image files are allowed!"));
};

const docFilter = (req, file, cb) => {
  if (!file) {
    return cb(null, true); // no file uploaded, allow
  }
  if (file.mimetype === "application/pdf") {
    return cb(null, true); // accept only pdf
  }
  cb(new Error("Only PDF files are allowed!"), false);
};

exports.uploadProductImages = multer({
  storage: makeStorage("products"),
  fileFilter: imageFilter,
});
exports.uploadProductDocs = multer({
  storage: makeStorage("products"),
  fileFilter: docFilter,
});
exports.uploadSchemeImages = multer({
  storage: makeStorage("schemes"),
  fileFilter: imageFilter,
});
exports.uploadTestimonialImages = multer({
  storage: makeStorage("testimonials"),
  fileFilter: imageFilter,
});
exports.uploadLaunchMedia = multer({ storage: makeStorage("launches") }); // allow any media
exports.uploadServiceIcons = multer({
  storage: makeStorage("services"),
  fileFilter: imageFilter,
});
exports.uploadMisc = multer({ storage: makeStorage("misc") });
