const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/AdminController');
const { requireAdmin } = require('../middleware/authMiddleware');

router.use(requireAdmin);

router.get('/users', (req, res, next) => AdminController.getAllUsers(req, res).catch(next));
router.get('/users/pending-teachers', (req, res, next) => AdminController.getPendingTeachers(req, res).catch(next));
router.patch('/users/:id/approve', (req, res, next) => AdminController.approveUser(req, res).catch(next));
router.patch('/users/:id/reject', (req, res, next) => AdminController.rejectUser(req, res).catch(next));

module.exports = router;
