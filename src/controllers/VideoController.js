const fs = require('fs');
const path = require('path');
const VideoRepository = require('../models/Video');
const { UPLOADS_DIR } = require('../config/constants');

class VideoController {
  getAll(req, res) {
    const videos = VideoRepository.getAll();
    res.json({ success: true, videos });
  }

  upload(req, res) {
    if (!req.file) return res.status(400).json({ message: 'Không có file video.' });
    
    VideoRepository.create({
      title: req.body.title || 'Video',
      description: req.body.description || '',
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      uploader: req.session.user.username
    });
    
    res.json({ success: true, message: 'Tải video lên thành công!' });
  }

  delete(req, res) {
    const id = parseInt(req.params.id);
    const video = VideoRepository.getById(id);
    
    if (!video) return res.status(404).json({ success: false, message: 'Video không tìm thấy.' });
    
    const fpath = path.join(UPLOADS_DIR, video.filename);
    if (fs.existsSync(fpath)) fs.unlinkSync(fpath);
    
    VideoRepository.delete(id);
    res.json({ success: true, message: 'Đã xóa video.' });
  }

  download(req, res) {
    const fpath = path.join(UPLOADS_DIR, req.params.filename);
    if (!fs.existsSync(fpath)) return res.status(404).json({ message: 'File không tìm thấy.' });
    res.download(fpath);
  }
}

module.exports = new VideoController();
