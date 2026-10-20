/**
 * Centralized environment configuration.
 * Loads variables from .env once and exposes a typed, validated config object.
 */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const REQUIRED = ['MONGO_URI', 'JWT_SECRET'];
const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`[config] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 10,

  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },

  // Timezone used for streak calendar-day boundaries.
  // Must be a valid IANA timezone string (e.g. 'UTC', 'Asia/Kolkata').
  // Changing this resets streak semantics for existing users on the boundary day only.
  streakTz: process.env.STREAK_TZ || 'UTC',

  // Gemini AI — intentionally optional.  When absent, AI features return a
  // graceful "unavailable" response; the server itself continues to run.
  geminiApiKey: process.env.GEMINI_API_KEY || '',
};

module.exports = env;
