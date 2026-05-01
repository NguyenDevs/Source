const NewsRepository = require('../models/News');

class NewsController {
  async getAll(req, res) {
    const limit = parseInt(req.query.limit) || 50;
    const news = await NewsRepository.getAll(limit);
    res.json({ success: true, news });
  }

  async create(req, res) {
    const { title, content, category_id, summary } = req.body;
    const thumbnail = req.file ? `/uploads/news/thumbnails/${req.file.filename}` : '';
    
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Tiêu đề và nội dung không được trống.' });
    }
    await NewsRepository.create({
      title,
      content,
      category_id,
      summary,
      author_id: req.session.user.id,
      thumbnail
    });
    res.json({ success: true, message: 'Đăng bài viết thành công.' });
  }

  async delete(req, res) {
    const id = parseInt(req.params.id);
    const news = await NewsRepository.getById(id);
    if (!news) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });
    await NewsRepository.delete(id);
    res.json({ success: true, message: 'Đã xóa bài viết.' });
  }

  async update(req, res) {
    const id = parseInt(req.params.id);
    const { title, content, category_id, summary } = req.body;
    const news = await NewsRepository.getById(id);
    if (!news) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });

    let thumbnail = news.thumbnail;
    if (req.file) {
      thumbnail = `/uploads/news/thumbnails/${req.file.filename}`;
    }

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Tiêu đề và nội dung không được trống.' });
    }
    
    await NewsRepository.update(id, { title, content, category_id, summary, thumbnail });
    res.json({ success: true, message: 'Cập nhật bài viết thành công.' });
  }
}

module.exports = new NewsController();
