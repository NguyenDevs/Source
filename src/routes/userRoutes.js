const express = require('express');
const router = express.Router();
const UserRepository = require('../models/User');
const db = require('../services/DatabaseService');
const { requireAdmin } = require('../middleware/authMiddleware');

router.get('/', requireAdmin, async (req, res) => {
  const users = await UserRepository.findAll();
  res.json({ success: true, users });
});

router.post('/update-role', requireAdmin, async (req, res) => {
  const { userId, role } = req.body;
  if (!userId || !role) return res.status(400).json({ success: false, message: 'Thiếu thông tin.' });
  const user = await UserRepository.findById(userId);
  if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
  if (user.username === 'admin') return res.status(400).json({ success: false, message: 'Không thể thay đổi vai trò admin.' });
  await db.run('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
  res.json({ success: true, message: 'Đã cập nhật vai trò.' });
});

router.post('/delete/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const user = await UserRepository.findById(id);
  if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
  if (user.username === 'admin') return res.status(400).json({ success: false, message: 'Không thể xóa admin.' });
  await db.run('DELETE FROM users WHERE id = ?', [id]);
  res.json({ success: true, message: 'Đã xóa người dùng.' });
});

module.exports = router;
