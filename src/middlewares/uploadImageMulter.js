// middlewares/uploadFile.js
const multer = require("multer");
const path = require("path");

// Store file in memory as a Buffer instead of saving to disk
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allowed MIME types
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  // Allowed extensions
  const allowedExts = [".jpeg", ".jpg", ".png", ".webp", ".gif"];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) { 
    cb(null, true); // ✅ valid file
  } else {
    // ❌ reject everything else
    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
  }
};

const uploadImageMulter = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 }, // 4 MB limit
  fileFilter,
});

module.exports = { uploadImageMulter };
