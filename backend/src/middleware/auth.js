/**
 * Authentication & authorization middleware.
 *
 *   router.get('/me', protect, handler)                 -> any logged-in user
 *   router.get('/admin', protect, authorize('admin'), h) -> admins only
 *   router.get('/feed', optionalAuth, handler)          -> req.user set if a valid token is sent
 */
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/token');

function extractToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

/** Verifies a token and returns the matching active user, or throws ApiError(401/403). */
async function resolveUser(token) {
  const payload = verifyToken(token);

  const user = await User.findById(payload.sub).select('+tokenVersion');
  if (!user) throw ApiError.unauthorized('User belonging to this token no longer exists');
  if (user.tokenVersion !== payload.tv) throw ApiError.unauthorized('Session has expired, please log in again');
  if (user.isSuspended) throw ApiError.forbidden('Your account has been suspended');

  return user;
}

/** Requires a valid JWT. Sets req.user. */
const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Authentication required. Please log in.');

  req.user = await resolveUser(token);
  next();
});

/** Attaches req.user if a valid token is present; otherwise continues anonymously. */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = await resolveUser(token);
    } catch {
      req.user = undefined;
    }
  }
  next();
});

/** Restricts a route to the given roles. Must be used after `protect`. */
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized('Authentication required. Please log in.'));
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    return next();
  };

module.exports = { protect, optionalAuth, authorize };
