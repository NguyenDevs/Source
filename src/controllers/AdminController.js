const UserRepository = require('../models/User');

class AdminController {
  async getAllUsers(req, res) {
    const users = await UserRepository.findAll();
    res.json({ success: true, users });
  }

  async getPendingTeachers(req, res) {
    const users = await UserRepository.findPendingTeachers();
    res.json({ success: true, users });
  }

  async approveUser(req, res) {
    const { id } = req.params;
    const user = await UserRepository.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }
    if (user.role !== 'teacher') {
      return res.status(400).json({ success: false, message: 'Chỉ có thể phê duyệt tài khoản giáo viên.' });
    }
    if (user.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Tài khoản đã được phê duyệt trước đó.' });
    }
    await UserRepository.updateStatus(id, 'approved');
    res.json({ success: true, message: 'Phê duyệt thành công.' });
  }

  async rejectUser(req, res) {
    const { id } = req.params;
    const user = await UserRepository.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }
    if (user.role !== 'teacher') {
      return res.status(400).json({ success: false, message: 'Chỉ có thể từ chối tài khoản giáo viên.' });
    }
    if (user.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Không thể từ chối tài khoản đã phê duyệt.' });
    }
    await UserRepository.updateStatus(id, 'rejected');
    res.json({ success: true, message: 'Đã từ chối tài khoản.' });
  }
}

module.exports = new AdminController();
