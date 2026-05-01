const express = require('express');
const router = express.Router();
const db = require('../services/DatabaseService');

function requireAdmin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });
  if (req.session.user.role !== 'admin') return res.status(403).json({ message: 'Chỉ admin mới được thực hiện.' });
  return next();
}

router.get('/', async (req, res) => {
  const news = await db.get('SELECT COUNT(*) AS count FROM news');
  const videos = await db.get('SELECT COUNT(*) AS count FROM videos');
  const users = await db.get('SELECT COUNT(*) AS count FROM users');
  res.json({
    success: true,
    stats: {
      news: news ? news.count : 0,
      videos: videos ? videos.count : 0,
      users: users ? users.count : 0
    }
  });
});

module.exports = router;
