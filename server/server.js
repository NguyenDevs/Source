/* ============================================================
   server.js — KPMTXQ API Server
   Serves static files from parent dir (root)
   MySQL database via mysql2
   REST API: auth, users, news, videos
=========================================================== */

require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Paths ──
const ROOT_DIR = path.join(__dirname, '..');   // C:\Users\ASUS\Desktop\Source
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads dir
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Database pool ──
let pool;
async function initDB() {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'kpmtxq_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Create database if not exists
  const dbName = process.env.DB_NAME || 'kpmtxq_db';
  const tempPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true
  });
  await tempPool.query('CREATE DATABASE IF NOT EXISTS `' + dbName + '`');
  await tempPool.end();

  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin','teacher','student','user') DEFAULT 'user',
      email VARCHAR(255) DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      slug VARCHAR(200) NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS news (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_id INT,
      title VARCHAR(500) NOT NULL,
      slug VARCHAR(500) NOT NULL,
      summary TEXT,
      content LONGTEXT,
      image VARCHAR(500) DEFAULT '',
      author_id INT,
      views INT DEFAULT 0,
      status ENUM('draft','published') DEFAULT 'published',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
      FULLTEXT INDEX ft_title_content (title, content)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS videos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      filename VARCHAR(500) NOT NULL,
      originalname VARCHAR(500) NOT NULL,
      size BIGINT DEFAULT 0,
      uploader_id INT,
      downloads INT DEFAULT 0,
      status ENUM('pending','approved') DEFAULT 'approved',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Seed admin if not exists
  const [admins] = await pool.query("SELECT id FROM users WHERE username = 'admin' LIMIT 1");
  if (admins.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await pool.query("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['admin', hash, 'admin']);
    console.log('✓ Admin account created: admin / admin123');
  }

  // Seed default categories
  const [cats] = await pool.query("SELECT id FROM categories LIMIT 1");
  if (cats.length === 0) {
    await pool.query(
      "INSERT INTO categories (name, slug, description) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?), (?, ?, ?)",
      ['Tin trong ngay', 'tin-trong-ngay', 'Tin tức trong ngày',
       'Tin trong tuan', 'tin-trong-tuan', 'Tin tức trong tuần',
       'Su kien chinh', 'su-kien-chinh', 'Các sự kiện chính của trường',
       'Thong bao', 'thong-bao', 'Thông báo quan trọng']
    );
  }

  console.log('✓ MySQL connected — Database ready');
}

// ── Multer ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 524288000 },
  fileFilter: (req, file, cb) => {
    const allowed = /mp4|avi|mov|mkv|webm|wmv|3gp|jpg|jpeg|png|gif|webp/;
    if (!allowed.test(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error('File type not allowed.'));
    }
    cb(null, true);
  }
});

// ── Middleware ──
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'kpmtxq-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true }
}));

// Serve static files from ROOT directory
app.use(express.static(ROOT_DIR));
// Serve uploads
app.use('/uploads', express.static(UPLOADS_DIR));

// ── Auth helpers ──
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập.' });
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Chỉ admin mới được thực hiện.' });
  }
  return next();
}

// ── API Routes ──

// GET /api/info — server info
app.get('/api/info', (req, res) => {
  res.json({ name: 'KPMTXQ API', version: '1.0.0', status: 'ok' });
});

// ── AUTH ──
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin.' });

    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0 || !bcrypt.compareSync(password, rows[0].password)) {
      return res.json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    const user = rows[0];
    delete user.password;
    req.session.user = user;
    res.json({ success: true, message: 'Đăng nhập thành công.', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email, role } = req.body;
    if (!username || !password) return res.json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin.' });
    if (username.length < 3) return res.json({ success: false, message: 'Tên đăng nhập phải có ít nhất 3 ký tự.' });
    if (password.length < 4) return res.json({ success: false, message: 'Mật khẩu phải có ít nhất 4 ký tự.' });

    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) return res.json({ success: false, message: 'Tên đăng nhập đã tồn tại.' });

    const hash = bcrypt.hashSync(password, 10);
    const userRole = (role === 'teacher' || role === 'student') ? role : 'user';
    await pool.query('INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
      [username, hash, email || '', userRole]);

    res.json({ success: true, message: 'Đăng ký thành công! Vui lòng đăng nhập.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

app.get('/api/auth/session', (req, res) => {
  if (req.session && req.session.user) {
    const { password, ...safe } = req.session.user;
    res.json({ success: true, user: safe });
  } else {
    res.json({ success: false, user: null });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true, message: 'Đăng xuất thành công.' }));
});

// ── USERS (admin) ──
app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username, email, role, created_at FROM users ORDER BY id DESC');
    res.json({ success: true, users: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

app.post('/api/users/update-role', requireAdmin, async (req, res) => {
  try {
    const { userId, role } = req.body;
    const validRoles = ['admin', 'teacher', 'student', 'user'];
    if (!validRoles.includes(role)) return res.json({ success: false, message: 'Vai trò không hợp lệ.' });
    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    res.json({ success: true, message: 'Cập nhật vai trò thành công.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

app.post('/api/users/delete/:id', requireAdmin, async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.session.user.id) {
      return res.json({ success: false, message: 'Không thể xóa tài khoản đang đăng nhập.' });
    }
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Đã xóa người dùng.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// ── NEWS ──
app.get('/api/news', async (req, res) => {
  try {
    const { category, limit = 20, offset = 0, search = '' } = req.query;
    let sql = `
      SELECT n.id, n.title, n.slug, n.summary, n.image, n.views, n.created_at,
             c.name as category_name, c.slug as category_slug,
             u.username as author_name
      FROM news n
      LEFT JOIN categories c ON n.category_id = c.id
      LEFT JOIN users u ON n.author_id = u.id
      WHERE n.status = 'published'
    `;
    const params = [];

    if (category) { sql += ' AND c.slug = ?'; params.push(category); }
    if (search) { sql += ' AND (n.title LIKE ? OR n.content LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    sql += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, news: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

app.get('/api/news/:slug', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT n.*, c.name as category_name, c.slug as category_slug, u.username as author_name
      FROM news n
      LEFT JOIN categories c ON n.category_id = c.id
      LEFT JOIN users u ON n.author_id = u.id
      WHERE n.slug = ? AND n.status = 'published'
    `, [req.params.slug]);

    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });

    // Increment views
    await pool.query('UPDATE news SET views = views + 1 WHERE id = ?', [rows[0].id]);
    rows[0].views += 1;

    res.json({ success: true, article: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

app.post('/api/news', requireAuth, async (req, res) => {
  try {
    const { title, slug, summary, content, category_id, image, status } = req.body;
    if (!title || !content) return res.json({ success: false, message: 'Tiêu đề và nội dung không được trống.' });

    const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    await pool.query(
      'INSERT INTO news (title, slug, summary, content, category_id, image, author_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, finalSlug, summary || '', content, category_id || null, image || '', req.session.user.id, status || 'published']
    );
    res.json({ success: true, message: 'Đăng bài viết thành công.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

app.post('/api/news/delete/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM news WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Đã xóa bài viết.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// ── CATEGORIES ──
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.json({ success: true, categories: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// ── VIDEOS ──
app.get('/api/videos', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT v.id, v.title, v.description, v.filename, v.originalname, v.size, v.downloads, v.created_at,
             u.username as uploader_name, u.role as uploader_role
      FROM videos v
      LEFT JOIN users u ON v.uploader_id = u.id
      WHERE v.status = 'approved'
      ORDER BY v.created_at DESC
    `);
    res.json({ success: true, videos: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

app.post('/api/videos/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.json({ success: false, message: 'Không có file hoặc file không hợp lệ.' });

    const { title, description } = req.body;
    await pool.query(
      'INSERT INTO videos (title, description, filename, originalname, size, uploader_id) VALUES (?, ?, ?, ?, ?, ?)',
      [title || req.file.originalname, description || '', req.file.filename, req.file.originalname, req.file.size, req.session.user.id]
    );

    res.json({ success: true, message: 'Tải video lên thành công!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

app.get('/api/videos/download/:filename', async (req, res) => {
  try {
    const fpath = path.join(UPLOADS_DIR, req.params.filename);
    if (!fs.existsSync(fpath)) return res.status(404).json({ success: false, message: 'File không tìm thấy.' });
    await pool.query('UPDATE videos SET downloads = downloads + 1 WHERE filename = ?', [req.params.filename]);
    res.download(fpath);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

app.post('/api/videos/delete/:id', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT filename FROM videos WHERE id = ?', [req.params.id]);
    if (rows.length > 0) {
      const fpath = path.join(UPLOADS_DIR, rows[0].filename);
      if (fs.existsSync(fpath)) fs.unlinkSync(fpath);
      await pool.query('DELETE FROM videos WHERE id = ?', [req.params.id]);
    }
    res.json({ success: true, message: 'Đã xóa video.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// ── Dashboard stats ──
app.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const [[newsCount]] = await pool.query('SELECT COUNT(*) as c FROM news');
    const [[videoCount]] = await pool.query('SELECT COUNT(*) as c FROM videos');
    const [[userCount]] = await pool.query('SELECT COUNT(*) as c FROM users');
    res.json({ success: true, stats: {
      news: newsCount.c, videos: videoCount.c, users: userCount.c
    }});
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// ── Catch-all ──
app.get('*', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, req.path));
});

// ── Start ──
async function start() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running at http://localhost:${PORT}`);
      console.log(`📁 Root: ${ROOT_DIR}`);
      console.log(`📁 Uploads: ${UPLOADS_DIR}`);
      console.log(`🗄️  Database: ${process.env.DB_NAME || 'kpmtxq_db'}\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    console.log('\n⚠️  Make sure MySQL (Laragon) is running and the database exists.');
    console.log('   Create database manually:');
    console.log(`   mysql -u root -e "CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'kpmtxq_db'}"\n`);
    process.exit(1);
  }
}

start();
