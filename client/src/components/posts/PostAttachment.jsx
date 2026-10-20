import React, { useState } from 'react';
import {
  FileText,
  FileCode,
  Download,
  ExternalLink,
  Image as ImageIcon,
  File,
} from 'lucide-react';
import { getMediaUrl, formatBytes } from '@/utils/formatters';
import { cn } from '@/utils/cn';

/**
 * Helper to get appropriate icon and colors for document extensions
 */
function getDocumentDetails(extension = '', _mimeType = '') {
  const ext = extension.toLowerCase().replace('.', '');
  if (ext === 'pdf') {
    return {
      label: 'PDF',
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      icon: <FileText className="w-5 h-5 text-rose-600" />,
    };
  }
  if (['doc', 'docx'].includes(ext)) {
    return {
      label: 'Word',
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      icon: <FileText className="w-5 h-5 text-blue-600" />,
    };
  }
  if (['ppt', 'pptx'].includes(ext)) {
    return {
      label: 'Slide',
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      icon: <FileText className="w-5 h-5 text-amber-600" />,
    };
  }
  if (ext === 'txt') {
    return {
      label: 'Text',
      color: 'text-slate-600 bg-slate-50 border-slate-200',
      icon: <FileCode className="w-5 h-5 text-slate-600" />,
    };
  }
  return {
    label: ext.toUpperCase() || 'DOC',
    color: 'text-brand-600 bg-brand-50 border-brand-200',
    icon: <File className="w-5 h-5 text-brand-600" />,
  };
}

/**
 * Render a single attachment according to its type (image, video, document)
 */
export function PostAttachmentItem({ attachment }) {
  const [imageError, setImageError] = useState(false);
  const mediaUrl = getMediaUrl(attachment.url);
  const type = attachment.type || 'document';

  if (type === 'image') {
    if (imageError) {
      return (
        <div className="w-full p-4 rounded-xl bg-surface-100 border border-surface-200 text-xs text-surface-500 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-surface-400" />
          <span>Unable to preview image ({attachment.originalName || 'file'})</span>
        </div>
      );
    }

    return (
      <div className="relative group overflow-hidden rounded-xl border border-surface-200/90 bg-surface-100/50">
        <a
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          title="Click to view full image"
        >
          <img
            src={mediaUrl}
            alt={attachment.originalName || 'Post attachment'}
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full max-h-96 object-cover transition-transform duration-200 group-hover:scale-[1.01]"
          />
          <div className="absolute inset-0 bg-surface-900/0 group-hover:bg-surface-900/10 transition-colors pointer-events-none" />
          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-surface-900/70 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> View full
          </span>
        </a>
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div className="overflow-hidden rounded-xl border border-surface-200/90 bg-black">
        <video
          controls
          preload="metadata"
          className="w-full max-h-96 object-contain"
        >
          <source src={mediaUrl} type={attachment.mimeType || 'video/mp4'} />
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  // Document attachment
  const doc = getDocumentDetails(attachment.extension, attachment.mimeType);

  return (
    <a
      href={mediaUrl}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.originalName || true}
      className="flex items-center justify-between p-3 rounded-xl border border-surface-200/90 bg-surface-50/70 hover:bg-surface-100/80 hover:border-surface-300 transition-colors group select-none"
    >
      <div className="flex items-center gap-3 min-w-0 mr-2">
        <div className="w-10 h-10 rounded-xl bg-white border border-surface-200/80 flex items-center justify-center shrink-0 shadow-subtle">
          {doc.icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-surface-900 group-hover:text-brand-600 transition-colors truncate">
            {attachment.originalName || 'Attached Document'}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-surface-400">
            <span
              className={cn(
                'px-1.5 py-0.2 rounded text-[10px] font-bold border',
                doc.color
              )}
            >
              {doc.label}
            </span>
            {attachment.size > 0 && <span>{formatBytes(attachment.size)}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0 text-surface-400 group-hover:text-brand-600 transition-colors">
        <span className="text-[11px] font-medium hidden sm:inline">Download</span>
        <Download className="w-4 h-4" />
      </div>
    </a>
  );
}

/**
 * Grouped attachments component supporting images, videos, and documents
 */
export function PostAttachments({ attachments = [] }) {
  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter((a) => a.type === 'image');
  const videos = attachments.filter((a) => a.type === 'video');
  const documents = attachments.filter(
    (a) => a.type === 'document' || (!a.type && a.url)
  );

  return (
    <div className="space-y-2.5 mt-3.5">
      {/* Video Attachments */}
      {videos.map((vid) => (
        <PostAttachmentItem key={vid._id || vid.url} attachment={vid} />
      ))}

      {/* Image Attachments */}
      {images.length === 1 && (
        <PostAttachmentItem attachment={images[0]} />
      )}

      {images.length > 1 && (
        <div
          className={cn(
            'grid gap-2',
            images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
          )}
        >
          {images.map((img) => (
            <PostAttachmentItem key={img._id || img.url} attachment={img} />
          ))}
        </div>
      )}

      {/* Document Attachments */}
      {documents.length > 0 && (
        <div className="space-y-1.5">
          {documents.map((doc) => (
            <PostAttachmentItem key={doc._id || doc.url} attachment={doc} />
          ))}
        </div>
      )}
    </div>
  );
}

export default PostAttachments;
