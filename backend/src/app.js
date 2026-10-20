/**
 * Express application setup (no network listening here — see server.js).
 */
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const env = require('./config/env');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// CORS: allow the configured React frontend origin(s)
app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (curl, Postman) which send no Origin header
      if (!origin || env.clientUrls.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging
if (!env.isProduction) app.use(morgan('dev'));

// Uploaded files (images, videos, documents). Hardened so files are never executed or content-sniffed.
const DOWNLOAD_ONLY_EXTENSIONS = new Set(['.doc', '.docx', '.ppt', '.pptx']);
app.use(
  '/uploads',
  express.static(path.resolve(__dirname, '../uploads'), {
    index: false,
    dotfiles: 'deny',
    maxAge: '7d',
    setHeaders(res, filePath) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // allow the React dev server to embed media
      if (DOWNLOAD_ONLY_EXTENSIONS.has(path.extname(filePath).toLowerCase())) {
        res.setHeader('Content-Disposition', 'attachment');
      }
    },
  })
);

// Routes
app.get('/', (req, res) => {
  res.json({ success: true, message: 'StudySync API is running', docs: '/api/health' });
});
app.use('/api', apiRoutes);

// 404 + centralized error handling (must be last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
