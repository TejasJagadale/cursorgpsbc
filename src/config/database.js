import mongoose from 'mongoose';

export async function connectDatabase(uri) {
  const mongoUri = uri || process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(mongoUri);

  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
