//const { v2: cloudinary } = require("cloudinary");
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: "dfkzyfoz6", // Cloudinary cloud name
  api_key: "132626738316462",       // Cloudinary API key
  api_secret: "pehhJJdpa_nrI-_ojLz11eIDk_U", // Cloudinary API secret
});

// Multer-Cloudinary storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "upload", // Folder name in Cloudinary
    allowed_formats: ["jpg", "jpeg", "png"], // Allowed image formats
  },
});

// Multer middleware for file uploads
const upload = multer({ storage });

module.exports = { cloudinary, storage, upload };
