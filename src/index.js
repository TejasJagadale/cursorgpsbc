import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';

async function bootstrap() {
  try {
    await connectDatabase(env.mongodbUri);
    console.log('Database connection verified');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

bootstrap();
