const NewsRepository = require('../models/News');

class NewsController {
  async getAll(req, res) {
    const limit = parseInt(req.query.limit) || 50;
    const news = await NewsRepository.getAll(limit);
    res.json({ success: true, news });
  }

  async create(req, res) {
    const { title, content, category_id, summary } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Tiêu đề và nội dung không được trống.' });
    }
    await NewsRepository.create({
      title,
      content,
      category_id,
      summary,
      author_id: req.session.user.id
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
}

module.exports = new NewsController();
