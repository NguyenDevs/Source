require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'kpmtxq_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

class DatabaseService {
  constructor() {
    this.pool = null;
    this._ready = null;
  }

  async init() {
    // Create database if not exists
    const tempConfig = { ...DB_CONFIG };
    delete tempConfig.database;
    const tempPool = mysql.createPool(tempConfig);
    await tempPool.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\``);
    await tempPool.end();

    // Create main pool
    this.pool = mysql.createPool(DB_CONFIG);

    // Create tables
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin','teacher','student','user') DEFAULT 'user',
        status ENUM('pending','approved','rejected','disabled') DEFAULT 'pending',
        email VARCHAR(255) DEFAULT '',
        full_name VARCHAR(255) DEFAULT '',
        avatar VARCHAR(255) DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS news (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        category_id INT,
        author_id INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        filename TEXT NOT NULL,
        originalname TEXT NOT NULL,
        size BIGINT DEFAULT 0,
        uploader TEXT,
        uploader_id INT,
        path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    this.migrateColumns();
    this.seedAdmin();
    this.seedCategories();

    console.log('Database initialized (MySQL).');
  }

  async migrateColumns() {
    try {
      await this.pool.query(`
        ALTER TABLE users ADD COLUMN status ENUM('pending','approved','rejected') DEFAULT 'pending' AFTER role
      `);
    } catch (e) {}

    try {
      await this.pool.query("UPDATE users SET status = 'approved' WHERE status IS NULL OR status = ''");
    } catch (e) {}

    try {
      await this.pool.query("ALTER TABLE videos ADD COLUMN uploader_id INT AFTER uploader");
    } catch (e) {}

    try {
      await this.pool.query("ALTER TABLE videos ADD COLUMN path TEXT AFTER uploader_id");
    } catch (e) {}

    try {
      await this.pool.query("ALTER TABLE videos MODIFY COLUMN size BIGINT DEFAULT 0");
    } catch (e) {}

    try {
      await this.pool.query("ALTER TABLE users ADD COLUMN full_name VARCHAR(255) DEFAULT '' AFTER email");
    } catch (e) {}

    try {
      await this.pool.query("ALTER TABLE users ADD COLUMN avatar VARCHAR(255) DEFAULT '' AFTER full_name");
    } catch (e) {}

    try {
      await this.pool.query("ALTER TABLE users MODIFY COLUMN status ENUM('pending','approved','rejected','disabled') DEFAULT 'pending'");
    } catch (e) {}
  }

  async seedAdmin() {
    const [rows] = await this.pool.query("SELECT id FROM users WHERE username = 'admin' LIMIT 1");
    if (rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('admin123', 10);
      await this.pool.query(
        "INSERT INTO users (username, password, role, status) VALUES (?, ?, ?, ?)",
        ['admin', hash, 'admin', 'approved']
      );
    } else {
      await this.pool.query("UPDATE users SET status = 'approved' WHERE username = 'admin' AND status != 'approved'");
    }
  }

  async seedCategories() {
    const [rows] = await this.pool.query("SELECT id FROM categories LIMIT 1");
    if (rows.length === 0) {
      const cats = ['Tin tức', 'Sự kiện', 'Giáo dục', 'Hoạt động', 'Thông báo'];
      for (const name of cats) {
        await this.pool.query('INSERT INTO categories (name) VALUES (?)', [name]);
      }
    }
  }

  async get(sql, params = []) {
    const [rows] = await this.pool.query(sql, params);
    return rows[0] || null;
  }

  async run(sql, params = []) {
    await this.pool.query(sql, params);
  }

  async all(sql, params = []) {
    const [rows] = await this.pool.query(sql, params);
    return rows;
  }
}

module.exports = new DatabaseService();
