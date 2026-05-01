const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const VideoController = require('../controllers/VideoController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const { UPLOADS_DIR, ALLOWED_VIDEO_EXT } = require('../config/constants');

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const username = req.session && req.session.user ? req.session.user.username : 'guest';
    const dest = path.join(UPLOADS_DIR, username, 'videos');
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
  }
});

const videoFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_VIDEO_EXT.test(ext)) {
    return cb(new Error('Chỉ chấp nhận file video (mp4, mov, avi, mkv, webm).'));
  }
  cb(null, true);
};

const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFilter,
  limits: { fileSize: 500 * 1024 * 1024 }
}).single('file');

router.get('/', (req, res, next) => VideoController.getAll(req, res).catch(next));

router.post('/upload', requireAuth, (req, res) => {
  uploadVideo(req, res, async (err) => {
    console.log('[VideoUpload] err:', err ? err.message : 'none', 'req.file:', req.file ? 'yes' : 'no', 'body:', req.body);
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File quá lớn (tối đa 500MB).' });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    try {
      await VideoController.upload(req, res);
    } catch (e) {
      console.error('[VideoUpload] controller error:', e);
      res.status(500).json({ success: false, message: 'Lỗi server khi lưu video.' });
    }
  });
});

router.delete('/:id', requireAdmin, (req, res, next) => VideoController.delete(req, res).catch(next));
router.post('/:id/delete', requireAdmin, (req, res, next) => VideoController.delete(req, res).catch(next));
router.get('/download/:username/:filename', VideoController.download);

module.exports = router;
