//const { v2: cloudinary } = require("cloudinary");
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require('multer');
const dotenv = require('dotenv');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME, // Cloudinary cloud name
  api_key: process.env.API_KEY,       // Cloudinary API key
  api_secret: process.env.API_SECRET, // Cloudinary API secret
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
