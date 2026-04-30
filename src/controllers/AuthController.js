const bcrypt = require('bcryptjs');
const UserRepository = require('../models/User');

class AuthController {
  getSession(req, res) {
    if (req.session.user) {
      const { password, ...safe } = req.session.user;
      res.json({ user: safe });
    } else {
      res.json({ user: null });
    }
  }

  login(req, res) {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
    }

    const user = UserRepository.findByUsername(username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    req.session.user = user;
    const { password: _, ...safe } = user;
    res.json({ success: true, message: 'Đăng nhập thành công.', user: safe });
  }

  register(req, res) {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin.' });
    }
    if (username.length < 3) {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập phải có ít nhất 3 ký tự.' });
    }
    if (password.length < 4) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 4 ký tự.' });
    }

    const existing = UserRepository.findByUsername(username);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Tên đăng nhập đã tồn tại.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    UserRepository.create(username, hash);
    res.json({ success: true, message: 'Đăng ký thành công. Vui lòng đăng nhập.' });
  }

  logout(req, res) {
    req.session.destroy(() => res.json({ success: true, message: 'Đăng xuất thành công.' }));
  }
}

module.exports = new AuthController();
