const db = require('../services/DatabaseService');

class VideoRepository {
  getAll() {
    return db.all('SELECT * FROM videos ORDER BY created_at DESC');
  }

  getById(id) {
    return db.get('SELECT * FROM videos WHERE id = ?', [id]);
  }

  create(videoData) {
    const { title, description, filename, originalname, size, uploader } = videoData;
    return db.run(
      'INSERT INTO videos (title, description, filename, originalname, size, uploader) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, filename, originalname, size, uploader]
    );
  }

  delete(id) {
    return db.run('DELETE FROM videos WHERE id = ?', [id]);
  }
}

module.exports = new VideoRepository();
