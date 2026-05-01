const UserRepository = require('../models/User');
const bcrypt = require('bcryptjs');

class UserController {
  async getProfile(req, res) {
    try {
      const user = await UserRepository.findById(req.session.user.id);
      if (!user) return res.status(404).json({ success: false, message: 'Người dùng không tồn tại.' });
      
      const { password, ...userData } = user;
      res.json({ success: true, user: userData });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
    }
  }

  async updateProfile(req, res) {
    try {
      const { full_name, avatar } = req.body;
      await UserRepository.updateProfile(req.session.user.id, { full_name, avatar });
      res.json({ success: true, message: 'Cập nhật thông tin thành công.' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
    }
  }

  async updateEmail(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ success: false, message: 'Vui lòng nhập email.' });
      await UserRepository.updateProfile(req.session.user.id, { email });
      res.json({ success: true, message: 'Cập nhật email thành công.' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
    }
  }

  async updatePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;
      const user = await UserRepository.findById(req.session.user.id);
      
      if (!bcrypt.compareSync(oldPassword, user.password)) {
        return res.status(400).json({ success: false, message: 'Mật khẩu cũ không chính xác.' });
      }

      const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
      await UserRepository.updateProfile(req.session.user.id, { password: hashedNewPassword });
      res.json({ success: true, message: 'Đổi mật khẩu thành công.' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
    }
  }
}

module.exports = new UserController();
