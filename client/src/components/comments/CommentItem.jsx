import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  CornerDownRight,
  Trash2,
  AlertCircle,
  Flame,
  ChevronDown,
  ChevronUp,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import Badge from '@/components/common/Badge';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import { CommentAttachments } from './CommentAttachment';
import { CommentForm } from './CommentForm';
import { formatDate } from '@/utils/formatters';
import { getReplies, addReply, deleteComment } from '@/api/comments';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/utils/cn';

export function CommentItem({
  comment,
  postId,
  onCommentDeleted,
  onCommentUpdated,
  isReply = false,
}) {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const toast = useToast();

  // Reply thread states
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [repliesPage, setRepliesPage] = useState(1);
  const [hasMoreReplies, setHasMoreReplies] = useState(false);
  const [repliesCount, setRepliesCount] = useState(Number(comment.repliesCount) || 0);

  // Inline reply box state
  const [isReplying, setIsReplying] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const author = comment.author || {
    _id: null,
    username: '[deleted]',
    profilePicture: '',
    levelName: 'Student',
    currentStreak: 0,
  };

  const isOwner = Boolean(
    user && author._id && (user._id === author._id || user.id === author._id)
  );
  const canDelete = Boolean(
    !comment.isDeleted && (comment.canDelete || isOwner || isAdmin)
  );

  // Moderation check
  const isPendingReview = comment.moderationStatus === 'pending_review';
  const isRemoved = comment.moderationStatus === 'removed';

  // Do not display removed comments
  if (isRemoved) return null;

  // If pending review, only show to owner or admin
  if (isPendingReview && !isOwner && !isAdmin) return null;

  // Load replies from backend
  const loadReplies = async (page = 1) => {
    setIsLoadingReplies(true);
    try {
      const res = await getReplies(postId, comment._id, { page, limit: 10 });
      if (res && res.replies) {
        if (page === 1) {
          setReplies(res.replies);
        } else {
          setReplies((prev) => [...prev, ...res.replies]);
        }
        setRepliesPage(page);
        setHasMoreReplies(Boolean(res.pagination?.hasMore));
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to load replies');
    } finally {
      setIsLoadingReplies(false);
    }
  };

  const toggleReplies = () => {
    const nextState = !showReplies;
    setShowReplies(nextState);
    if (nextState && replies.length === 0) {
      loadReplies(1);
    }
  };

  // Submit reply
  const handleAddReply = async (formDataOrData) => {
    const res = await addReply(postId, comment._id, formDataOrData);
    if (res && res.comment) {
      const newReply = res.comment;
      setReplies((prev) => [...prev, newReply]);
      setRepliesCount((prev) => prev + 1);
      setShowReplies(true);
      setIsReplying(false);
      toast.success('Reply added');
      // Notify parent about new comment for total counter
      onCommentUpdated?.(1);
    }
  };

  // Delete comment / reply
  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteComment(postId, comment._id);
      setShowDeleteModal(false);
      toast.success('Comment deleted');
      onCommentDeleted?.(comment._id, repliesCount > 0);
    } catch (err) {
      setDeleteError(err?.message || 'Failed to delete comment');
      toast.error(err?.message || 'Failed to delete comment');
    } finally {
      setIsDeleting(false);
    }
  };

  // Callback when a child reply is deleted
  const handleChildReplyDeleted = (childReplyId) => {
    setReplies((prev) => prev.filter((r) => r._id !== childReplyId));
    setRepliesCount((prev) => Math.max(0, prev - 1));
    onCommentUpdated?.(-1);
  };

  return (
    <div
      className={cn(
        'group relative transition-all rounded-xl',
        isReply ? 'py-2.5' : 'py-3.5 border-b border-surface-100 last:border-b-0'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Author Avatar */}
        {comment.isDeleted ? (
          <div className="w-8 h-8 rounded-full bg-surface-200 flex items-center justify-center shrink-0 text-surface-500 text-xs font-semibold">
            ?
          </div>
        ) : (
          <Link
            to={author.username ? `/users/${author.username}` : '#'}
            className="shrink-0 group/avatar"
          >
            <Avatar
              name={author.username || 'Scholar'}
              src={author.profilePicture}
              size={isReply ? 'sm' : 'md'}
              className="group-hover/avatar:ring-2 group-hover/avatar:ring-brand-500 transition-all"
            />
          </Link>
        )}

        <div className="flex-1 min-w-0">
          {/* Header: Author name, badges, timestamp, moderation status */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {comment.isDeleted ? (
                <span className="text-xs font-semibold text-surface-400 italic">
                  [deleted]
                </span>
              ) : (
                <>
                  <Link
                    to={`/users/${author.username}`}
                    className="text-xs font-bold text-surface-900 hover:text-brand-600 transition-colors"
                  >
                    @{author.username}
                  </Link>

                  {author.levelName && (
                    <Badge variant="primary" size="sm" className="text-[10px] px-1.5 py-0">
                      {author.levelName}
                    </Badge>
                  )}

                  {author.currentStreak > 0 && (
                    <span
                      className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1 py-0.2 rounded border border-amber-200/60"
                      title={`${author.currentStreak} day study streak`}
                    >
                      <Flame className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                      <span>{author.currentStreak}d</span>
                    </span>
                  )}
                </>
              )}

              <span className="text-[11px] text-surface-400">
                • {formatDate(comment.createdAt)}
              </span>

              {isPendingReview && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                  <ShieldAlert className="w-3 h-3 text-amber-600" />
                  <span>Pending review</span>
                </span>
              )}
            </div>

            {/* Delete button (if permitted) */}
            {canDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                aria-label="Delete comment"
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-md text-surface-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                title="Delete comment"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Comment Body */}
          <div className="mt-1.5">
            {comment.isDeleted ? (
              <p className="text-xs text-surface-400 italic bg-surface-50 p-2 rounded-lg border border-surface-200/60">
                [This comment has been deleted]
              </p>
            ) : (
              <>
                {comment.content && (
                  <p className="text-xs sm:text-sm text-surface-800 leading-relaxed whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                )}

                {/* Attachments */}
                {comment.attachments && comment.attachments.length > 0 && (
                  <CommentAttachments attachments={comment.attachments} />
                )}
              </>
            )}
          </div>

          {/* Action Row: Reply button & Replies toggle */}
          {!comment.isDeleted && (
            <div className="mt-2.5 flex items-center gap-4 text-xs text-surface-500">
              {/* Reply toggle */}
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => setIsReplying((prev) => !prev)}
                  className="inline-flex items-center gap-1 font-semibold text-surface-500 hover:text-brand-600 transition-colors"
                >
                  <CornerDownRight className="w-3.5 h-3.5" />
                  <span>{isReplying ? 'Cancel' : 'Reply'}</span>
                </button>
              )}

              {/* View/Hide Replies toggle (only for top-level comments with replies) */}
              {!isReply && repliesCount > 0 && (
                <button
                  type="button"
                  onClick={toggleReplies}
                  className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                >
                  {showReplies ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Hide replies</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>
                        View {repliesCount} {repliesCount === 1 ? 'reply' : 'replies'}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Inline Reply Form */}
          {isReplying && (
            <div className="mt-3 pl-3 border-l-2 border-brand-300 animate-fadeIn">
              <CommentForm
                onSubmit={handleAddReply}
                onCancel={() => setIsReplying(false)}
                placeholder={`Reply to @${author.username || 'scholar'}...`}
                buttonText="Post Reply"
                initialContent={isReply ? `@${author.username} ` : ''}
                autoFocus
                compact
              />
            </div>
          )}

          {/* Replies Thread */}
          {showReplies && (
            <div className="mt-3 pl-4 sm:pl-6 border-l-2 border-surface-200/80 space-y-2">
              {isLoadingReplies && replies.length === 0 ? (
                <div className="py-2 flex items-center gap-2 text-xs text-surface-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
                  <span>Loading replies...</span>
                </div>
              ) : (
                <>
                  {replies.map((reply) => (
                    <CommentItem
                      key={reply._id}
                      comment={reply}
                      postId={postId}
                      onCommentDeleted={handleChildReplyDeleted}
                      onCommentUpdated={onCommentUpdated}
                      isReply
                    />
                  ))}

                  {hasMoreReplies && (
                    <button
                      type="button"
                      onClick={() => loadReplies(repliesPage + 1)}
                      disabled={isLoadingReplies}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 py-1 transition-colors"
                    >
                      {isLoadingReplies ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Loading more...</span>
                        </>
                      ) : (
                        <span>Load more replies</span>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        title="Delete Comment"
        description="Are you sure you want to delete this comment? Attached files and content will be removed."
        maxWidth="max-w-md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isDeleting}
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? 'Deleting...' : 'Delete Comment'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-surface-600">
            This comment will be removed from the discussion:
          </p>
          <div className="p-3 rounded-xl bg-surface-50 border border-surface-200 text-xs text-surface-800 italic line-clamp-3 break-words">
            &ldquo;{comment.content || 'Attached study file'}&rdquo;
          </div>
          {deleteError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default CommentItem;
