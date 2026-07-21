import app from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';

async function startServer() {
  try {
    await connectDatabase(env.mongodbUri);
    console.log('MongoDB connected');

    app.listen(env.port, () => {
      console.log(`Server running on http://localhost:${env.port}`);
      console.log(`Health check: http://localhost:${env.port}/api/v1/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
