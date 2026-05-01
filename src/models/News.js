const db = require('../services/DatabaseService');

class NewsRepository {
  async getAll(limit = 50) {
    return db.all(`
      SELECT n.*, c.name AS category_name, u.username AS author_name
      FROM news n
      LEFT JOIN categories c ON n.category_id = c.id
      LEFT JOIN users u ON n.author_id = u.id
      ORDER BY n.created_at DESC
      LIMIT ?
    `, [limit]);
  }

  async getById(id) {
    return db.get('SELECT * FROM news WHERE id = ?', [id]);
  }

  async create({ title, content, category_id, summary, author_id }) {
    await db.run(
      'INSERT INTO news (title, content, category_id, summary, author_id) VALUES (?, ?, ?, ?, ?)',
      [title, content, category_id || null, summary || '', author_id]
    );
  }

  async delete(id) {
    await db.run('DELETE FROM news WHERE id = ?', [id]);
  }
}

module.exports = new NewsRepository();
