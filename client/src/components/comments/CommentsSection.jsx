import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { CommentForm } from './CommentForm';
import { CommentItem } from './CommentItem';
import Button from '@/components/common/Button';
import { getComments, addComment } from '@/api/comments';
import { useToast } from '@/context/ToastContext';

export function CommentsSection({
  postId,
  onCountChange,
  initialCount = 0,
  showHeader = true,
  autoFocus = false,
}) {
  const toast = useToast();

  const [comments, setComments] = useState([]);
  const [totalCount, setTotalCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Fetch comments from backend
  const fetchComments = useCallback(
    async (targetPage = 1, append = false) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const res = await getComments(postId, { page: targetPage, limit: 15 });
        if (res && res.comments) {
          if (append) {
            setComments((prev) => [...prev, ...res.comments]);
          } else {
            setComments(res.comments);
          }
          setPage(targetPage);
          setHasMore(Boolean(res.pagination?.hasMore));
          if (res.pagination?.total !== undefined) {
            // Note: pagination.total on comments is top-level comments count;
            // post.commentsCount is top-level + replies.
          }
        }
      } catch (err) {
        setError(err?.message || 'Failed to load comments');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [postId]
  );

  useEffect(() => {
    if (postId) {
      fetchComments(1, false);
    }
  }, [postId, fetchComments]);

  // Handle adding top-level comment
  const handleAddComment = async (data) => {
    const res = await addComment(postId, data);
    if (res && res.comment) {
      const newComment = res.comment;
      setComments((prev) => [newComment, ...prev]);
      setTotalCount((prev) => prev + 1);
      onCountChange?.(1);

      if (newComment.moderationStatus === 'pending_review') {
        toast.info('Comment posted and is currently pending moderation review');
      } else {
        toast.success('Comment posted successfully');
      }
    }
  };

  // Handle top-level comment deleted
  const handleCommentDeleted = (commentId, hasReplies) => {
    if (hasReplies) {
      // Keep soft-deleted placeholder so reply thread remains visible
      setComments((prev) =>
        prev.map((c) =>
          c._id === commentId
            ? {
                ...c,
                isDeleted: true,
                content: '[deleted]',
                attachments: [],
                canDelete: false,
              }
            : c
        )
      );
    } else {
      // Remove cleanly from list
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    }
    setTotalCount((prev) => Math.max(0, prev - 1));
    onCountChange?.(-1);
  };

  // Callback from child replies to update global count
  const handleChildCountDelta = (delta) => {
    setTotalCount((prev) => Math.max(0, prev + delta));
    onCountChange?.(delta);
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      {showHeader && (
        <div className="flex items-center justify-between pb-2 border-b border-surface-100">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-bold text-surface-900">
              Discussion & Answers
            </h3>
            {totalCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200/60">
                {totalCount}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => fetchComments(1, false)}
            disabled={isLoading}
            className="p-1 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-surface-100 transition-colors"
            title="Refresh comments"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* Main Comment Composer */}
      <CommentForm
        onSubmit={handleAddComment}
        placeholder="Share your perspective, solution, or question with the study group..."
        buttonText="Post Comment"
        autoFocus={autoFocus}
      />

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchComments(1, false)}
            className="text-xs py-0.5 px-2 text-rose-700 border-rose-300 hover:bg-rose-100"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Comments List Area */}
      <div className="space-y-1">
        {isLoading ? (
          <div className="py-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-surface-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="w-1/4 h-3 rounded bg-surface-200" />
                  <div className="w-full h-3 rounded bg-surface-200" />
                  <div className="w-3/4 h-3 rounded bg-surface-200" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="py-10 text-center rounded-2xl border border-dashed border-surface-200 bg-surface-50/50 p-6">
            <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-2.5">
              <MessageSquare className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-surface-900">
              No comments yet
            </p>
            <p className="text-[11px] text-surface-500 mt-0.5 max-w-xs mx-auto">
              Be the first to share an explanation, answer questions, or provide study notes!
            </p>
          </div>
        ) : (
          <div>
            {comments.map((comment) => (
              <CommentItem
                key={comment._id}
                comment={comment}
                postId={postId}
                onCommentDeleted={handleCommentDeleted}
                onCommentUpdated={handleChildCountDelta}
              />
            ))}

            {/* Pagination Button */}
            {hasMore && (
              <div className="pt-4 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchComments(page + 1, true)}
                  disabled={isLoadingMore}
                  isLoading={isLoadingMore}
                  className="text-xs"
                >
                  {isLoadingMore ? 'Loading more comments...' : 'Load more comments'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CommentsSection;
