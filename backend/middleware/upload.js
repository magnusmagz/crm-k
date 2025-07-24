const multer = require('multer');
const path = require('path');

// Configure multer for memory storage (we'll process the file without saving to disk)
const storage = multer.memoryStorage();

// File filter to only accept CSV files
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;
  
  if (ext === '.csv' || mimeType === 'text/csv' || mimeType === 'application/csv') {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'), false);
  }
};

// Create multer instance with size limit (5MB)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

module.exports = upload;