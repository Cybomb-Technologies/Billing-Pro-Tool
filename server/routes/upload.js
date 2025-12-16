// routes/upload.js (Conceptual)
import express from 'express';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Define storage for files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // You must create a 'public/logos' folder in your server root
    cb(null, 'public/logos'); 
  },
  filename: (req, file, cb) => {
    // Save file with original extension and a timestamp to prevent collisions
    cb(null, 'logo-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 1000000 }, // Limit file size to 1MB
    fileFilter: (req, file, cb) => {
        // Only allow image formats
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb('Error: File upload only supports the following filetypes: ' + filetypes);
    }
}).single('logo'); // 'logo' is the key expected in the FormData

// POST /api/upload/logo
router.post('/logo', (req, res) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(500).json({ message: 'Multer error during upload.', error: err.message });
        } else if (err) {
            return res.status(400).json({ message: 'File validation failed.', error: err });
        }
        
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }

        // Return the public path where the file is stored
        const filePath = `/logos/${req.file.filename}`; // This path is saved to MongoDB
        res.json({ message: 'Logo uploaded successfully.', logoUrl: filePath });
    });
});

export default router;