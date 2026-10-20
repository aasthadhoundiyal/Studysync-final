/**
 * Centralized error handling.
 * All errors are returned in a consistent shape:
 *   { success: false, message: string, details?: any, stack?: string }
 */
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { cleanupRequestFiles } = require('../utils/files');

/** 404 for any unmatched route. */
function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/** Converts known library errors into ApiErrors. */
function normalizeError(err) {
  if (err instanceof ApiError) return err;

  // Mongoose: schema validation failed
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return new ApiError(400, 'Validation failed', details);
  }
  // Mongoose: invalid ObjectId or type cast
  if (err.name === 'CastError') {
    return new ApiError(400, `Invalid value for field '${err.path}'`);
  }
  // MongoDB: duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return new ApiError(409, `A record with this ${field} already exists`);
  }
  // express.json(): malformed JSON body
  if (err.type === 'entity.parse.failed') {
    return new ApiError(400, 'Malformed JSON in request body');
  }
  // express.json(): body too large
  if (err.type === 'entity.too.large') {
    return new ApiError(413, 'Request body too large');
  }
  // JWT errors (for upcoming auth module)
  if (err.name === 'JsonWebTokenError') return new ApiError(401, 'Invalid token');
  if (err.name === 'TokenExpiredError') return new ApiError(401, 'Token expired');

  // Multer (file uploads)
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') return new ApiError(413, 'File is too large');
    if (err.code === 'LIMIT_FILE_COUNT') return new ApiError(400, 'Too many files');
    if (err.code === 'LIMIT_UNEXPECTED_FILE') return new ApiError(400, `Unexpected file field '${err.field}'`);
    return new ApiError(400, err.message);
  }

  const status = err.statusCode || err.status || 500;
  return new ApiError(status, status === 500 ? 'Internal server error' : err.message);
}

// eslint-disable-next-line no-unused-vars
async function errorHandler(err, req, res, next) {
  const error = normalizeError(err);

  if (error.statusCode >= 500) {
    console.error('[error]', err);
  }

  // A failed request must not leave uploaded files behind (e.g. post validation failed after upload).
  await cleanupRequestFiles(req);

  const body = { success: false, message: error.message };
  if (error.details) body.details = error.details;
  if (!env.isProduction && error.statusCode >= 500) body.stack = err.stack;

  res.status(error.statusCode).json(body);
}

module.exports = { notFound, errorHandler };
