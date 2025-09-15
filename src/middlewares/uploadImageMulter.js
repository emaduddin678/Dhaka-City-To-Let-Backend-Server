// middlewares/uploadFile.js
const multer = require("multer");

// Store file in memory as a Buffer instead of saving to disk
const storage = multer.memoryStorage();

const uploadImageMulter = multer({ storage });

module.exports = { uploadImageMulter };
