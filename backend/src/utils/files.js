/**
 * Helpers for files stored in the local uploads directory.
 */
const fs = require('fs/promises');
const path = require('path');

const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');

/** True if an absolute path is inside the uploads folder. */
const isInsideUploads = (absolute) => absolute.startsWith(UPLOADS_ROOT + path.sep);

async function unlinkQuietly(absolute) {
  try {
    await fs.unlink(absolute);
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn(`[files] Could not delete ${absolute}: ${err.message}`);
  }
}

/**
 * Deletes a previously uploaded file given its public path ("/uploads/...").
 * External URLs and paths outside the uploads folder are ignored. Never throws.
 */
async function deleteLocalUpload(publicPath) {
  if (!publicPath || typeof publicPath !== 'string' || !publicPath.startsWith('/uploads/')) return;

  const absolute = path.resolve(UPLOADS_ROOT, publicPath.replace(/^\/uploads\//, ''));
  if (!isInsideUploads(absolute)) return; // path traversal guard
  await unlinkQuietly(absolute);
}

/** Deletes files by absolute disk path (e.g. multer's file.path). Only touches files inside uploads/. */
async function removeFiles(absolutePaths = []) {
  await Promise.all(
    absolutePaths.filter(Boolean).map((p) => path.resolve(p)).filter(isInsideUploads).map(unlinkQuietly)
  );
}

/** Removes any files multer stored for this request (used when the request ultimately fails). */
async function cleanupRequestFiles(req) {
  let files = [];
  if (req.file) files = [req.file];
  else if (Array.isArray(req.files)) files = req.files;
  else if (req.files && typeof req.files === 'object') files = Object.values(req.files).flat();
  await removeFiles(files.map((f) => f.path));
}

module.exports = { UPLOADS_ROOT, deleteLocalUpload, removeFiles, cleanupRequestFiles };
