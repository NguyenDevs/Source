const db = require('../services/DatabaseService');

class UserRepository {
  findByUsername(username) {
    return db.get('SELECT * FROM users WHERE username = ?', [username]);
  }

  findById(id) {
    return db.get('SELECT * FROM users WHERE id = ?', [id]);
  }

  create(username, hashedPassword, role = 'user') {
    return db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hashedPassword, role]);
  }
}

module.exports = new UserRepository();
