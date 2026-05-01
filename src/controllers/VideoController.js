const fs = require('fs');
const path = require('path');
const VideoRepository = require('../models/Video');
const { UPLOADS_DIR } = require('../config/constants');

class VideoController {
  async getAll(req, res) {
    const videos = await VideoRepository.getAll();
    res.json({ success: true, videos });
  }

  async upload(req, res) {
    console.log('[Controller] req.file:', req.file, 'session user:', req.session.user);
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Không có file video.' });
    }

    const username = req.session.user.username;
    const relativePath = `${username}/videos/${req.file.filename}`;
    console.log('[Controller] inserting:', { title: req.body.title, filename: req.file.filename, uploader: username, uploader_id: req.session.user.id, path: relativePath });

    await VideoRepository.create({
      title: req.body.title || req.file.originalname,
      description: req.body.description || '',
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      uploader: username,
      uploader_id: req.session.user.id,
      path: relativePath
    });

    res.json({ success: true, message: 'Tải video lên thành công!' });
  }

  async delete(req, res) {
    const id = parseInt(req.params.id);
    const video = await VideoRepository.getById(id);
    if (!video) return res.status(404).json({ success: false, message: 'Video không tìm thấy.' });

    const fpath = path.join(UPLOADS_DIR, video.path || video.uploader, 'videos', video.filename);
    if (fs.existsSync(fpath)) fs.unlinkSync(fpath);

    await VideoRepository.delete(id);
    res.json({ success: true, message: 'Đã xóa video.' });
  }

  download(req, res) {
    const { username, filename } = req.params;
    const fpath = path.join(UPLOADS_DIR, username, 'videos', filename);
    if (!fs.existsSync(fpath)) return res.status(404).json({ message: 'File không tìm thấy.' });
    res.download(fpath);
  }
}

module.exports = new VideoController();
