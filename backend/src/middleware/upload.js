/**
 * File-upload middleware (multer, local disk storage) with layered validation:
 *
 *   1. Extension whitelist        - only known-safe types (no executables, scripts, SVG, HTML, ...)
 *   2. MIME check                 - the browser-reported type must match the extension
 *   3. Size limits                - per category (image/video/document) + total per request
 *   4. Content sniffing           - the file's magic bytes must match its claimed type
 *
 * Files are saved with random names (never the user-supplied name) in backend/uploads/<subdir>/
 * and served at /uploads/<subdir>/<file>.
 *
 * Usage:
 *   const upload = createUploader({ subdir: 'posts', allowedExtensions: POST_ATTACHMENT_EXTENSIONS, ... });
 *   router.post('/', protect, upload.array('attachments'), handler);   // returns [multer, verify] middleware
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const ApiError = require('../utils/ApiError');
const { UPLOADS_ROOT, removeFiles } = require('../utils/files');

const MB = 1024 * 1024;

/** Max size per file, by category. */
const CATEGORY_LIMITS_MB = { image: 5, video: 50, document: 20 };

// --- Magic-byte signatures ---------------------------------------------------
const startsWith = (buf, bytes, offset = 0) => bytes.every((b, i) => buf[offset + i] === b);
const ascii = (s) => [...s].map((c) => c.charCodeAt(0));

const SIGNATURES = {
  jpeg: (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  png: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  gif: (b) => startsWith(b, ascii('GIF87a')) || startsWith(b, ascii('GIF89a')),
  webp: (b) => startsWith(b, ascii('RIFF')) && startsWith(b, ascii('WEBP'), 8),
  mp4: (b) => startsWith(b, ascii('ftyp'), 4),
  pdf: (b) => b.subarray(0, 1024).includes(Buffer.from('%PDF')),
  ole: (b) => startsWith(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), // legacy .doc / .ppt
  zip: (b) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]), // .docx / .pptx (Office Open XML)
  text: (b) => !b.includes(0x00), // plain text must not contain NUL bytes (rules out binaries)
};

/**
 * Whitelist of supported file types, keyed by lowercase extension.
 * `mime` is the canonical type stored/served; `acceptMimes` are browser-reported types accepted on upload.
 */
const FILE_TYPES = {
  jpg: { category: 'image', mime: 'image/jpeg', signature: 'jpeg', acceptMimes: ['image/jpeg', 'image/pjpeg'] },
  jpeg: { category: 'image', mime: 'image/jpeg', signature: 'jpeg', acceptMimes: ['image/jpeg', 'image/pjpeg'] },
  png: { category: 'image', mime: 'image/png', signature: 'png', acceptMimes: ['image/png'] },
  webp: { category: 'image', mime: 'image/webp', signature: 'webp', acceptMimes: ['image/webp'] },
  gif: { category: 'image', mime: 'image/gif', signature: 'gif', acceptMimes: ['image/gif'] },
  mp4: { category: 'video', mime: 'video/mp4', signature: 'mp4', acceptMimes: ['video/mp4'] },
  pdf: { category: 'document', mime: 'application/pdf', signature: 'pdf', acceptMimes: ['application/pdf'] },
  doc: { category: 'document', mime: 'application/msword', signature: 'ole', acceptMimes: ['application/msword'] },
  docx: {
    category: 'document',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    signature: 'zip',
    acceptMimes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
  },
  ppt: {
    category: 'document',
    mime: 'application/vnd.ms-powerpoint',
    signature: 'ole',
    acceptMimes: ['application/vnd.ms-powerpoint', 'application/mspowerpoint'],
  },
  pptx: {
    category: 'document',
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    signature: 'zip',
    acceptMimes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/zip'],
  },
  txt: { category: 'document', mime: 'text/plain', signature: 'text', acceptMimes: ['text/plain'] },
};

// Some browsers/OSes send a generic type for valid files; content sniffing still verifies these.
const GENERIC_MIMES = ['application/octet-stream', 'binary/octet-stream'];

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const POST_ATTACHMENT_EXTENSIONS = Object.keys(FILE_TYPES);

const getExtension = (filename = '') => path.extname(filename).slice(1).toLowerCase();

/** Strips paths, control characters and dangerous characters from a user-supplied name (display only). */
function sanitizeOriginalName(name = '') {
  const base = path.basename(String(name).replace(/\\/g, '/'));
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return (cleaned || 'file').slice(0, 200);
}

/** Collects uploaded files from req.file / req.files (array or field map). */
function collectFiles(req) {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  if (req.files && typeof req.files === 'object') return Object.values(req.files).flat();
  return [];
}

async function readHead(filePath, bytes = 8192) {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(bytes);
    const { bytesRead } = await handle.read(buffer, 0, bytes, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

const describe = (extensions) => extensions.map((e) => `.${e}`).join(', ');

/**
 * Creates upload middleware for one destination.
 * @param {object} opts
 * @param {string} opts.subdir             - folder inside uploads/
 * @param {string[]} opts.allowedExtensions - subset of FILE_TYPES keys
 * @param {number} [opts.maxFiles=1]
 * @param {number} [opts.maxFileSizeMB]    - hard per-file cap (defaults to the largest allowed category limit)
 * @param {number} [opts.maxTotalSizeMB]   - cap on the combined size of all files in one request
 */
function createUploader({ subdir, allowedExtensions, maxFiles = 1, maxFileSizeMB, maxTotalSizeMB }) {
  const dir = path.join(UPLOADS_ROOT, subdir);
  fs.mkdirSync(dir, { recursive: true });

  const categoryCap = Math.max(...allowedExtensions.map((ext) => CATEGORY_LIMITS_MB[FILE_TYPES[ext].category]));
  const perFileCapMB = maxFileSizeMB || categoryCap;

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    // Random name + extension derived from the validated type. The user's filename never touches the disk.
    filename: (req, file, cb) => cb(null, `${crypto.randomBytes(16).toString('hex')}.${file.validatedExt}`),
  });

  const fileFilter = (req, file, cb) => {
    const ext = getExtension(file.originalname);
    const type = allowedExtensions.includes(ext) ? FILE_TYPES[ext] : null;
    if (!type) {
      return cb(ApiError.badRequest(`File type not allowed: "${sanitizeOriginalName(file.originalname)}". Allowed: ${describe(allowedExtensions)}`));
    }
    const reported = (file.mimetype || '').toLowerCase();
    if (!type.acceptMimes.includes(reported) && !GENERIC_MIMES.includes(reported)) {
      return cb(ApiError.badRequest(`File "${sanitizeOriginalName(file.originalname)}" does not match its extension (.${ext})`));
    }
    file.validatedExt = ext;
    return cb(null, true);
  };

  const multerInstance = multer({
    storage,
    fileFilter,
    limits: { fileSize: perFileCapMB * MB, files: maxFiles, fields: 20, fieldSize: 1 * MB },
  });

  /** Wraps a multer middleware to turn its errors into clear, context-aware ApiErrors. */
  const wrap = (middleware, fieldName) => (req, res, next) =>
    middleware(req, res, (err) => {
      if (!err) return next();
      if (err.name !== 'MulterError') return next(err);
      switch (err.code) {
        case 'LIMIT_FILE_SIZE':
          return next(new ApiError(413, `File is too large. Maximum size is ${perFileCapMB} MB`));
        case 'LIMIT_FILE_COUNT':
          return next(ApiError.badRequest(`You can upload at most ${maxFiles} file(s)`));
        case 'LIMIT_UNEXPECTED_FILE':
          return next(
            ApiError.badRequest(
              err.field === fieldName
                ? `You can upload at most ${maxFiles} file(s)`
                : `Unexpected file field '${err.field}'. Use '${fieldName}'`
            )
          );
        default:
          return next(ApiError.badRequest(err.message));
      }
    });

  /** Post-upload checks: category size limits, total size, magic bytes. Enriches each file with metadata. */
  const verify = async (req, res, next) => {
    const files = collectFiles(req);
    if (!files.length) return next();

    try {
      let total = 0;
      for (const file of files) {
        const type = FILE_TYPES[file.validatedExt];
        const name = sanitizeOriginalName(file.originalname);
        const limitMB = Math.min(CATEGORY_LIMITS_MB[type.category], perFileCapMB);

        if (file.size === 0) throw ApiError.badRequest(`File "${name}" is empty`);
        if (file.size > limitMB * MB) {
          throw new ApiError(413, `File "${name}" is too large. Maximum for ${type.category}s is ${limitMB} MB`);
        }
        total += file.size;

        const head = await readHead(file.path);
        if (!SIGNATURES[type.signature](head)) {
          throw ApiError.badRequest(`File "${name}" content does not match its type (.${file.validatedExt})`);
        }

        file.safeOriginalName = name;
        file.category = type.category;
        file.canonicalMime = type.mime;
        file.publicPath = `/uploads/${subdir}/${file.filename}`;
      }
      if (maxTotalSizeMB && total > maxTotalSizeMB * MB) {
        throw new ApiError(413, `Total upload size exceeds ${maxTotalSizeMB} MB`);
      }
      return next();
    } catch (err) {
      await removeFiles(files.map((f) => f.path));
      return next(err);
    }
  };

  return {
    single: (field) => [wrap(multerInstance.single(field), field), verify],
    array: (field, max = maxFiles) => [wrap(multerInstance.array(field, max), field), verify],
  };
}

/** Builds the attachment sub-document stored on a post from a verified uploaded file. */
const toAttachment = (file) => ({
  type: file.category,
  url: file.publicPath,
  originalName: file.safeOriginalName,
  mimeType: file.canonicalMime,
  extension: file.validatedExt,
  size: file.size,
});

/** Public URL path for a stored file, e.g. "/uploads/avatars/abc.png". */
const toPublicPath = (subdir, filename) => `/uploads/${subdir}/${filename}`;

module.exports = {
  createUploader,
  toAttachment,
  toPublicPath,
  collectFiles,
  FILE_TYPES,
  CATEGORY_LIMITS_MB,
  IMAGE_EXTENSIONS,
  POST_ATTACHMENT_EXTENSIONS,
};
