const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');

router.get('/session', AuthController.getSession);
router.post('/login', (req, res, next) => AuthController.login(req, res).catch(next));
router.post('/register', (req, res, next) => AuthController.register(req, res).catch(next));
router.post('/logout', AuthController.logout);

module.exports = router;
