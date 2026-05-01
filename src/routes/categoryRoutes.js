const express = require('express');
const router = express.Router();
const db = require('../services/DatabaseService');

function requireAdmin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });
  if (req.session.user.role !== 'admin') return res.status(403).json({ message: 'Chỉ admin mới được thực hiện.' });
  return next();
}

router.get('/', async (req, res) => {
  const cats = await db.all('SELECT * FROM categories ORDER BY name');
  res.json({ success: true, categories: cats });
});

router.post('/', requireAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Tên danh mục không được trống.' });
  await db.run('INSERT INTO categories (name) VALUES (?)', [name.trim()]);
  res.json({ success: true, message: 'Đã thêm danh mục.' });
});

router.post('/delete/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.run('DELETE FROM categories WHERE id = ?', [id]);
  res.json({ success: true, message: 'Đã xóa danh mục.' });
});

module.exports = router;
