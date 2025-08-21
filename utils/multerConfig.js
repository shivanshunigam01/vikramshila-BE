const multer = require("multer");
const path = require("path");
const fs = require("fs");

function makeStorage(folderName) {
  const uploadPath = path.join(__dirname, "..", "uploads", folderName);

  // Ensure folder exists
  fs.mkdirSync(uploadPath, { recursive: true });

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + "-" + file.originalname);
    },
  });
}

module.exports = { makeStorage };
