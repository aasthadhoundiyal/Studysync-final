import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, ExternalLink, MessageSquare } from 'lucide-react';
import { CommentsSection } from './CommentsSection';
import Avatar from '@/components/common/Avatar';
import Badge from '@/components/common/Badge';

export function CommentsModal({
  isOpen,
  onClose,
  post,
  onCountChange,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Prevent background scrolling while modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !post) return null;

  const author = post.author || { username: 'scholar' };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="comments-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-surface-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-modal border border-surface-200 overflow-hidden flex flex-col max-h-[90vh] my-auto animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-surface-200/80 bg-surface-50/70 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <Avatar
                name={author.username}
                src={author.profilePicture}
                size="xs"
              />
              <span className="text-xs font-semibold text-surface-700">
                @{author.username}
              </span>
              <span className="text-[11px] text-surface-400">• Discussion</span>
            </div>

            <h2
              id="comments-modal-title"
              className="text-sm sm:text-base font-bold text-surface-900 truncate leading-snug"
            >
              {post.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/posts/${post._id}`}
              onClick={onClose}
              className="p-1.5 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-surface-200/60 transition-colors"
              title="Open full post page"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close comments"
              className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-200/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Content: Scrollable comments thread */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain">
          <CommentsSection
            postId={post._id}
            initialCount={Number(post.commentsCount) || 0}
            onCountChange={onCountChange}
            showHeader={false}
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}

export default CommentsModal;
