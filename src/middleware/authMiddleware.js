function requireAuth(req, res, next) {
  if (req.session.user) return next();
  return res.status(401).json({ message: 'Vui lòng đăng nhập.' });
}

function requireAdmin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới được thực hiện.' });
  }
  return next();
}

function requireCreator(req, res, next) {
  if (!req.session.user) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });
  const role = req.session.user.role;
  if (role !== 'admin' && role !== 'teacher') {
    return res.status(403).json({ message: 'Chỉ giáo viên hoặc admin mới được phép thực hiện.' });
  }
  return next();
}

module.exports = { requireAuth, requireAdmin, requireCreator };
