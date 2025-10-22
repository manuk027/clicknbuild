import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,       // from your Cloudinary dashboard
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "re-image",                     // folder in Cloudinary
    allowed_formats: ["jpg", "jpeg", "png", "webp"], // allowed image formats
    public_id: (req, file) => Date.now() + "-" + file.originalname, // custom filename
  },
});

// Initialize multer with Cloudinary storage
const uploads = multer({ storage });

export default uploads;
