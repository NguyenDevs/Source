const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const NewsController = require('../controllers/NewsController');
const { requireAdmin } = require('../middleware/authMiddleware');
const { UPLOADS_DIR } = require('../config/constants');

const newsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(UPLOADS_DIR, 'news', 'thumbnails');
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `thumb-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
  }
});

const uploadThumb = multer({
  storage: newsStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).single('thumbnail');

router.get('/', (req, res, next) => NewsController.getAll(req, res).catch(next));

router.post('/', requireAdmin, (req, res) => {
  uploadThumb(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    NewsController.create(req, res).catch(err => res.status(500).json({ success: false, message: err.message }));
  });
});

router.put('/:id', requireAdmin, (req, res) => {
  uploadThumb(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    NewsController.update(req, res).catch(err => res.status(500).json({ success: false, message: err.message }));
  });
});

router.post('/delete/:id', requireAdmin, (req, res, next) => NewsController.delete(req, res).catch(next));

module.exports = router;
