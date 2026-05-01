const express = require('express');
const router = express.Router();
const UserRepository = require('../models/User');
const db = require('../services/DatabaseService');
const UserController = require('../controllers/UserController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// Public/Admin routes
router.get('/', requireAdmin, async (req, res) => {
  const users = await UserRepository.findAll();
  res.json({ success: true, users });
});

// Profile routes
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { UPLOADS_DIR } = require('../config/constants');

// Avatar storage configuration
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(UPLOADS_DIR, 'avatars');
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const userId = req.session.user.id;
    cb(null, `avatar-${userId}-${Date.now()}${ext}`);
  }
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif, webp).'));
  }
}).single('avatar');

router.get('/profile', requireAuth, (req, res) => UserController.getProfile(req, res));
router.post('/update-profile', requireAuth, (req, res) => UserController.updateProfile(req, res));
router.post('/update-email', requireAuth, (req, res) => UserController.updateEmail(req, res));
router.post('/update-password', requireAuth, (req, res) => UserController.updatePassword(req, res));

router.post('/upload-avatar', requireAuth, (req, res) => {
  uploadAvatar(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh.' });
    
    try {
      const avatarPath = `/uploads/avatars/${req.file.filename}`;
      // Update user in DB
      await UserRepository.updateProfile(req.session.user.id, { avatar: avatarPath });
      
      // Update session
      req.session.user.avatar = avatarPath;
      
      res.json({ success: true, avatar: avatarPath });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Lỗi server khi lưu ảnh đại diện.' });
    }
  });
});

// Admin specific actions on users
router.post('/update-role', requireAdmin, async (req, res) => {
  const { userId, role } = req.body;
  if (!userId || !role) return res.status(400).json({ success: false, message: 'Thiếu thông tin.' });
  const user = await UserRepository.findById(userId);
  if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
  if (user.username === 'admin') return res.status(400).json({ success: false, message: 'Không thể thay đổi vai trò admin.' });
  await db.run('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
  res.json({ success: true, message: 'Đã cập nhật vai trò.' });
});

router.post('/update-status', requireAdmin, async (req, res) => {
  const { userId, status } = req.body;
  if (!userId || !status) return res.status(400).json({ success: false, message: 'Thiếu thông tin.' });
  const user = await UserRepository.findById(userId);
  if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
  if (user.username === 'admin') return res.status(400).json({ success: false, message: 'Không thể thay đổi trạng thái admin.' });
  await UserRepository.updateStatus(userId, status);
  res.json({ success: true, message: 'Đã cập nhật trạng thái.' });
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
