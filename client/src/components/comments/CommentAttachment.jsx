import React, { useState } from 'react';
import {
  FileText,
  FileCode,
  Download,
  ExternalLink,
  Image as ImageIcon,
  File,
  X,
  Film,
} from 'lucide-react';
import { getMediaUrl, formatBytes } from '@/utils/formatters';
import { cn } from '@/utils/cn';

/**
 * Returns color and icon for document attachments based on extension
 */
function getDocumentDetails(extension = '') {
  const ext = extension.toLowerCase().replace('.', '');
  if (ext === 'pdf') {
    return {
      label: 'PDF',
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      icon: <FileText className="w-4 h-4 text-rose-600" />,
    };
  }
  if (['doc', 'docx'].includes(ext)) {
    return {
      label: 'DOC',
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      icon: <FileText className="w-4 h-4 text-blue-600" />,
    };
  }
  if (['ppt', 'pptx'].includes(ext)) {
    return {
      label: 'PPT',
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      icon: <FileText className="w-4 h-4 text-amber-600" />,
    };
  }
  if (ext === 'txt') {
    return {
      label: 'TXT',
      color: 'text-slate-600 bg-slate-50 border-slate-200',
      icon: <FileCode className="w-4 h-4 text-slate-600" />,
    };
  }
  return {
    label: ext.toUpperCase() || 'FILE',
    color: 'text-brand-600 bg-brand-50 border-brand-200',
    icon: <File className="w-4 h-4 text-brand-600" />,
  };
}

/**
 * Single comment attachment renderer
 */
export function CommentAttachmentItem({ attachment }) {
  const [hasError, setHasError] = useState(false);
  const mediaUrl = getMediaUrl(attachment.url);
  const type = attachment.type || 'document';

  if (type === 'image') {
    if (hasError) {
      return (
        <div className="p-2.5 rounded-lg bg-surface-100 border border-surface-200 text-[11px] text-surface-500 flex items-center gap-2">
          <ImageIcon className="w-3.5 h-3.5 text-surface-400" />
          <span>Unable to preview image ({attachment.originalName || 'image'})</span>
        </div>
      );
    }

    return (
      <div className="relative group inline-block overflow-hidden rounded-lg border border-surface-200/90 bg-surface-100 max-w-sm">
        <a
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          title="Click to view full image"
        >
          <img
            src={mediaUrl}
            alt={attachment.originalName || 'Comment attachment'}
            loading="lazy"
            onError={() => setHasError(true)}
            className="max-h-56 w-auto object-cover rounded-lg transition-transform group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-surface-900/0 group-hover:bg-surface-900/10 transition-colors pointer-events-none" />
          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-surface-900/75 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <ExternalLink className="w-2.5 h-2.5" /> Full
          </span>
        </a>
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div className="max-w-md overflow-hidden rounded-lg border border-surface-200/90 bg-black">
        <video
          controls
          preload="metadata"
          className="w-full max-h-56 object-contain"
        >
          <source src={mediaUrl} type={attachment.mimeType || 'video/mp4'} />
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  // Document attachment
  const doc = getDocumentDetails(attachment.extension);

  return (
    <a
      href={mediaUrl}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.originalName || true}
      className="inline-flex items-center justify-between gap-3 p-2 rounded-lg border border-surface-200/90 bg-surface-50/80 hover:bg-surface-100/90 hover:border-surface-300 transition-colors group max-w-md select-none"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-md bg-white border border-surface-200/70 flex items-center justify-center shrink-0">
          {doc.icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-surface-900 group-hover:text-brand-600 transition-colors truncate max-w-[200px] sm:max-w-[260px]">
            {attachment.originalName || 'Attached Document'}
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-surface-400">
            <span className={cn('px-1 py-0.2 rounded font-bold border', doc.color)}>
              {doc.label}
            </span>
            {attachment.size > 0 && <span>{formatBytes(attachment.size)}</span>}
          </div>
        </div>
      </div>

      <Download className="w-3.5 h-3.5 text-surface-400 group-hover:text-brand-600 transition-colors shrink-0 ml-1" />
    </a>
  );
}

/**
 * Group of attachments rendered inside a comment or reply
 */
export function CommentAttachments({ attachments = [] }) {
  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter((a) => a.type === 'image');
  const videos = attachments.filter((a) => a.type === 'video');
  const documents = attachments.filter(
    (a) => a.type === 'document' || (!a.type && a.url)
  );

  return (
    <div className="space-y-2 mt-2">
      {videos.map((vid) => (
        <CommentAttachmentItem key={vid._id || vid.url} attachment={vid} />
      ))}

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img) => (
            <CommentAttachmentItem key={img._id || img.url} attachment={img} />
          ))}
        </div>
      )}

      {documents.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {documents.map((doc) => (
            <CommentAttachmentItem key={doc._id || doc.url} attachment={doc} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Pending files selected by the user in the comment / reply composer before submitting
 */
export function CommentPendingAttachments({ files = [], onRemove }) {
  if (!files || files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2.5 pt-2 border-t border-surface-200/60">
      {files.map((file, idx) => {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        const previewUrl = isImage ? URL.createObjectURL(file) : null;

        return (
          <div
            key={`${file.name}-${idx}`}
            className="flex items-center gap-2 p-1.5 pr-2 rounded-lg bg-surface-100 border border-surface-200/80 text-xs text-surface-700 max-w-xs group"
          >
            {isImage && previewUrl ? (
              <img
                src={previewUrl}
                alt={file.name}
                className="w-8 h-8 rounded object-cover shrink-0"
              />
            ) : isVideo ? (
              <div className="w-8 h-8 rounded bg-surface-200 flex items-center justify-center shrink-0">
                <Film className="w-4 h-4 text-surface-600" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded bg-surface-200 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-surface-600" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold truncate text-surface-800">
                {file.name}
              </p>
              <p className="text-[10px] text-surface-400">
                {formatBytes(file.size)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onRemove(idx)}
              aria-label={`Remove ${file.name}`}
              className="p-1 rounded-md text-surface-400 hover:text-rose-600 hover:bg-surface-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default CommentAttachments;
