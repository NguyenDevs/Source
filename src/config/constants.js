const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  PUBLIC_DIR: path.join(__dirname, '../../public'),
  UPLOADS_DIR: path.join(__dirname, '../../uploads'),
  DB_PATH: path.join(__dirname, '../../database.db'),
  SESSION_SECRET: 'kpmtxq-secret-2026',
  ALLOWED_VIDEO_EXT: /mp4|avi|mov|mkv|webm|wmv|3gp/
};
