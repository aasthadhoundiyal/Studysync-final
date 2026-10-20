/**
 * JWT helpers.
 * Payload: { sub: userId, role, tv: tokenVersion }
 */
const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, tv: user.tokenVersion || 0 }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });
}

/** Throws JsonWebTokenError / TokenExpiredError (handled by the error middleware). */
function verifyToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

module.exports = { signToken, verifyToken };
