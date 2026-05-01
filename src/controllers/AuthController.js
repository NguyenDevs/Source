const bcrypt = require('bcryptjs');
const UserRepository = require('../models/User');

class AuthController {
  getSession(req, res) {
    if (req.session.user) {
      const { password, ...safe } = req.session.user;
      res.json({ success: true, user: safe });
    } else {
      res.json({ success: true, user: null });
    }
  }

  async login(req, res) {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
    }

    const user = await UserRepository.findByUsername(username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    if (user.status !== 'approved') {
      return res.status(403).json({ success: false, message: 'Tài khoản của bạn chưa được phê duyệt.' });
    }

    req.session.user = user;
    const { password: _, ...safe } = user;
    res.json({ success: true, message: 'Đăng nhập thành công.', user: safe });
  }

  async register(req, res) {
    const { username, password, role, email } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin.' });
    }
    if (username.length < 3) {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập phải có ít nhất 3 ký tự.' });
    }
    if (password.length < 4) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 4 ký tự.' });
    }

    const validRoles = ['user', 'teacher'];
    const accountRole = validRoles.includes(role) ? role : 'user';
    const accountEmail = email || null;

    const existing = await UserRepository.findByUsername(username);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Tên đăng nhập đã tồn tại.' });
    }

    const hash = bcrypt.hashSync(password, 10);

    if (accountRole === 'teacher') {
      await UserRepository.create(username, hash, accountRole, 'pending', accountEmail);
      return res.json({ success: true, message: 'Đăng ký thành công. Tài khoản giáo viên cần được phê duyệt trước khi sử dụng.' });
    }

    await UserRepository.create(username, hash, accountRole, 'approved', accountEmail);
    res.json({ success: true, message: 'Đăng ký thành công. Vui lòng đăng nhập.' });
  }

  logout(req, res) {
    req.session.destroy(() => res.json({ success: true, message: 'Đăng xuất thành công.' }));
  }
}

module.exports = new AuthController();
