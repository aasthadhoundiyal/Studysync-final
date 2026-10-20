/**
 * MongoDB connection via Mongoose.
 */
const mongoose = require('mongoose');
const env = require('./env');

mongoose.set('strictQuery', true);

async function connectDB() {
  mongoose.connection.on('connected', () => {
    console.log(`[db] MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  });
  mongoose.connection.on('error', (err) => {
    console.error(`[db] MongoDB error: ${err.message}`);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected');
  });

  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.connection.close();
}

/** Human-readable connection state, used by the health check. */
function getDBStatus() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || 'unknown';
}

module.exports = { connectDB, disconnectDB, getDBStatus };
