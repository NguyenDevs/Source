const app = require('./src/app');
const dbService = require('./src/services/DatabaseService');
const { PORT } = require('./src/config/constants');

async function startServer() {
  try {
    await dbService.init();
    
    app.listen(PORT, () => {
      console.log(`=========================================`);
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`Mode: Production (Modular Refactor)`);
      console.log(`=========================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
