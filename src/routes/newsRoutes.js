const express = require('express');
const router = express.Router();
const NewsController = require('../controllers/NewsController');
const { requireAdmin } = require('../middleware/authMiddleware');

router.get('/', (req, res, next) => NewsController.getAll(req, res).catch(next));
router.post('/', requireAdmin, (req, res, next) => NewsController.create(req, res).catch(next));
router.post('/delete/:id', requireAdmin, (req, res, next) => NewsController.delete(req, res).catch(next));

module.exports = router;
