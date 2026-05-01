const db = require('../services/DatabaseService');

class VideoRepository {
  async getAll() {
    return db.all(`
      SELECT v.id, v.title, v.description, v.filename, v.originalname, v.size,
             v.uploader, v.uploader_id, v.path, v.created_at,
             u.username AS uploader_name, u.role AS uploader_role
      FROM videos v
      LEFT JOIN users u ON v.uploader_id = u.id
      ORDER BY v.created_at DESC
    `);
  }

  async getById(id) {
    return db.get('SELECT * FROM videos WHERE id = ?', [id]);
  }

  async create({ title, description, filename, originalname, size, uploader, uploader_id, path: videoPath }) {
    await db.run(
      'INSERT INTO videos (title, description, filename, originalname, size, uploader, uploader_id, path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description, filename, originalname, size, uploader, uploader_id, videoPath]
    );
  }

  async delete(id) {
    await db.run('DELETE FROM videos WHERE id = ?', [id]);
  }
}

module.exports = new VideoRepository();
