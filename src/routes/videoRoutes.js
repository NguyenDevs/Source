const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const VideoController = require('../controllers/VideoController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const { UPLOADS_DIR, ALLOWED_VIDEO_EXT } = require('../config/constants');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_VIDEO_EXT.test(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error('Chỉ chấp nhận file video.'));
    }
    cb(null, true);
  }
});

router.get('/', VideoController.getAll);
router.post('/upload', requireAuth, upload.single('video'), VideoController.upload);
router.delete('/:id', requireAdmin, VideoController.delete);
router.get('/download/:filename', VideoController.download);

module.exports = router;
