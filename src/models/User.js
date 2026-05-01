const db = require('../services/DatabaseService');

class UserRepository {
  async findByUsername(username) {
    return db.get('SELECT * FROM users WHERE username = ?', [username]);
  }

  async findById(id) {
    return db.get('SELECT * FROM users WHERE id = ?', [id]);
  }

  async create(username, hashedPassword, role = 'user', status = 'pending', email = null) {
    await db.run('INSERT INTO users (username, password, role, status, email) VALUES (?, ?, ?, ?, ?)', [username, hashedPassword, role, status, email]);
  }

  async findAll() {
    return db.all('SELECT id, username, role, status, created_at FROM users ORDER BY id DESC');
  }

  async findPendingTeachers() {
    return db.all("SELECT id, username, role, status, created_at FROM users WHERE role = 'teacher' AND status = 'pending' ORDER BY id DESC");
  }

  async updateStatus(id, status) {
    await db.run('UPDATE users SET status = ? WHERE id = ?', [status, id]);
  }
}

module.exports = new UserRepository();
