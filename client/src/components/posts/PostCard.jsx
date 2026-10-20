import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  Trash2,
  Flame,
  Hash,
  Check,
  Calendar,
  AlertCircle,
  Sparkles,
  FileText,
} from 'lucide-react';
import Card, { CardContent, CardFooter, CardHeader } from '@/components/common/Card';
import Avatar from '@/components/common/Avatar';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import { PostAttachments } from './PostAttachment';
import { CommentsModal } from '@/components/comments/CommentsModal';
import { QuizModal } from '@/components/quiz/QuizModal';
import { AISummaryModal } from '@/components/ai/AISummaryModal';
import { formatDate } from '@/utils/formatters';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { likePost, unlikePost, bookmarkPost, unbookmarkPost, recordShare, deletePost } from '@/api/posts';
import { cn } from '@/utils/cn';

const CONTENT_PREVIEW_LIMIT = 320;

export function PostCard({ post, onDelete, onUpdate }) {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const toast = useToast();

  // Engagement states initialized from post data
  const [isLiked, setIsLiked] = useState(Boolean(post.isLiked));
  const [likesCount, setLikesCount] = useState(Number(post.likesCount) || 0);
  const [isBookmarked, setIsBookmarked] = useState(Boolean(post.isBookmarked));
  const [sharesCount, setSharesCount] = useState(Number(post.sharesCount) || 0);
  const [commentsCount, setCommentsCount] = useState(Number(post.commentsCount) || 0);

  // Synchronize internal state when post prop updates (e.g. from parent re-fetch or pagination)
  useEffect(() => {
    setIsLiked(Boolean(post.isLiked));
    setLikesCount(Number(post.likesCount) || 0);
    setIsBookmarked(Boolean(post.isBookmarked));
    setSharesCount(Number(post.sharesCount) || 0);
    setCommentsCount(Number(post.commentsCount) || 0);
  }, [post.isLiked, post.likesCount, post.isBookmarked, post.sharesCount, post.commentsCount]);

  // In-flight request locks and feedback states
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);
  const [isShareLoading, setIsShareLoading] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Content collapse state for long posts
  const [isExpanded, setIsExpanded] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Comments slide-over modal state
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  // AI Quiz modal state
  const [isQuizOpen, setIsQuizOpen] = useState(false);

  const handleOpenQuiz = () => {
    if (!isAuthenticated) {
      toast.info('Please sign in to generate and take AI quizzes');
      navigate('/login');
      return;
    }
    setIsQuizOpen(true);
  };

  // AI Summary & Keywords modal state
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [summaryInitialTab, setSummaryInitialTab] = useState('summary');

  const handleOpenSummary = (initialTab = 'summary') => {
    if (!isAuthenticated) {
      toast.info('Please sign in to view AI summaries and keywords');
      navigate('/login');
      return;
    }
    setSummaryInitialTab(initialTab);
    setIsSummaryOpen(true);
  };

  const author = post.author || {
    _id: null,
    username: 'scholar',
    profilePicture: '',
    levelName: 'Student',
    currentStreak: 0,
  };

  const isOwner = Boolean(
    user && author._id && (user._id === author._id || user.id === author._id)
  );
  const canDelete = Boolean(post.canDelete || isOwner || isAdmin);

  const rawContent = post.content || '';
  const isLongContent = rawContent.length > CONTENT_PREVIEW_LIMIT;
  const displayedContent =
    isLongContent && !isExpanded
      ? `${rawContent.slice(0, CONTENT_PREVIEW_LIMIT)}...`
      : rawContent;

  // 1. Like / Unlike Handler with Optimistic UI & Reversal
  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.info('Please sign in to like study posts');
      navigate('/login');
      return;
    }
    if (isLikeLoading) return; // Prevent duplicate requests

    setActionError(null);
    const prevLiked = isLiked;
    const prevCount = likesCount;
    const nextLiked = !prevLiked;
    const nextCount = nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1);

    // Optimistic UI update
    setIsLiked(nextLiked);
    setLikesCount(nextCount);
    setIsLikeLoading(true);

    try {
      const res = nextLiked
        ? await likePost(post._id)
        : await unlikePost(post._id);

      if (res && res.likesCount !== undefined) {
        // Reconcile with exact server response
        setLikesCount(res.likesCount);
        setIsLiked(Boolean(res.liked));
        onUpdate?.({ ...post, isLiked: Boolean(res.liked), likesCount: res.likesCount });
      }
    } catch (err) {
      // Revert optimistic update on failure
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
      toast.error(err?.message || 'Failed to update like status');
    } finally {
      setIsLikeLoading(false);
    }
  };

  // 2. Bookmark / Remove Bookmark Handler
  const handleBookmark = async () => {
    if (!isAuthenticated) {
      toast.info('Please sign in to bookmark study posts');
      navigate('/login');
      return;
    }
    if (isBookmarkLoading) return; // Prevent duplicate requests

    setActionError(null);
    const prevBookmarked = isBookmarked;
    const nextBookmarked = !prevBookmarked;

    // Optimistic UI update
    setIsBookmarked(nextBookmarked);
    setIsBookmarkLoading(true);

    try {
      const res = nextBookmarked
        ? await bookmarkPost(post._id)
        : await unbookmarkPost(post._id);

      if (res) {
        const saved = Boolean(res.saved);
        setIsBookmarked(saved);
        onUpdate?.({ ...post, isBookmarked: saved });

        if (saved) {
          toast.success('Post saved to bookmarks');
        } else {
          toast.info('Post removed from bookmarks');
        }
      }
    } catch (err) {
      // Revert optimistic update on failure
      setIsBookmarked(prevBookmarked);
      toast.error(err?.message || 'Failed to update bookmark');
    } finally {
      setIsBookmarkLoading(false);
    }
  };

  // 3. Share Handler (Native Web Share + Clipboard Fallback + Backend Record)
  const handleShare = async () => {
    if (isShareLoading) return;
    const postUrl = `${window.location.origin}/posts/${post._id}`;

    let sharedNatively = false;

    // Try native share if available (mobile browsers, etc.)
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: rawContent ? rawContent.slice(0, 140) : post.title,
          url: postUrl,
        });
        sharedNatively = true;
        toast.success('Post shared successfully!');
      } catch (err) {
        if (err.name === 'AbortError') {
          // User closed share sheet without sharing
          return;
        }
        // Fall back to clipboard if native share failed
      }
    }

    if (!sharedNatively) {
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(postUrl);
        }
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2500);
        toast.success('Post link copied to clipboard!');
      } catch (err) {
        toast.error(err?.message || 'Failed to copy link to clipboard');
      }
    }

    // Record share in backend if authenticated (backend controls points & counts)
    if (isAuthenticated) {
      setIsShareLoading(true);
      try {
        const res = await recordShare(post._id);
        if (res?.sharesCount !== undefined) {
          setSharesCount(res.sharesCount);
          onUpdate?.({ ...post, sharesCount: res.sharesCount });
        }
      } catch (err) {
        console.warn('[Share Record]:', err?.message);
      } finally {
        setIsShareLoading(false);
      }
    }
  };

  // 4. Delete Post Handler
  const handleDeletePost = async () => {
    setIsDeleting(true);
    setActionError(null);

    try {
      await deletePost(post._id);
      setShowDeleteModal(false);
      toast.success('Study post deleted successfully');
      onDelete?.(post._id);
    } catch (err) {
      setActionError(err?.message || 'Failed to delete post. Please verify your permissions.');
      toast.error(err?.message || 'Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <article aria-labelledby={`post-title-${post._id}`}>
        <Card className="transition-all hover:border-surface-300">
          {/* Card Header: Author info, timestamp, and optional delete action */}
          <CardHeader className="py-4">
            <div className="flex items-start justify-between gap-3">
              {/* Author & Metadata */}
              <div className="flex items-center gap-3 min-w-0">
                <Link to={`/users/${author.username}`} className="shrink-0 group">
                  <Avatar
                    name={author.username}
                    src={author.profilePicture}
                    size="md"
                    className="group-hover:ring-2 group-hover:ring-brand-500 transition-all"
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/users/${author.username}`}
                      className="text-xs font-bold text-surface-900 hover:text-brand-600 transition-colors truncate"
                    >
                      @{author.username}
                    </Link>

                    {author.levelName && (
                      <Badge variant="primary" size="sm">
                        {author.levelName}
                      </Badge>
                    )}

                    {author.currentStreak > 0 && (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md"
                        title={`${author.currentStreak} day study streak`}
                      >
                        <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span>{author.currentStreak}d</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-surface-400 mt-0.5">
                    <Calendar className="w-3 h-3 text-surface-400" />
                    <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
                  </div>
                </div>
              </div>

              {/* Right Side Header Actions: Delete (strictly when authorized) */}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  aria-label="Delete study post"
                  className="p-1.5 rounded-lg text-surface-400 hover:text-rose-600 hover:bg-rose-50 transition-colors focus-visible:ring-2 focus-visible:ring-rose-500 outline-none"
                  title="Delete post"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </CardHeader>

          {/* Card Body: Title, text content, tags, and media attachments */}
          <CardContent className="py-4">
            {/* Post Title */}
            <Link to={`/posts/${post._id}`} className="group block mb-2">
              <h2
                id={`post-title-${post._id}`}
                className="text-base sm:text-lg font-bold text-surface-900 group-hover:text-brand-600 transition-colors tracking-tight leading-snug"
              >
                {post.title}
              </h2>
            </Link>

            {/* Post Text Content */}
            {rawContent && (
              <div className="text-xs sm:text-sm text-surface-700 leading-relaxed break-words whitespace-pre-wrap">
                {displayedContent}
                {isLongContent && (
                  <button
                    type="button"
                    onClick={() => setIsExpanded((prev) => !prev)}
                    className="ml-2 font-semibold text-brand-600 hover:text-brand-700 text-xs inline-block"
                  >
                    {isExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}

            {/* Post Attachments (Images, Videos, Documents) */}
            {post.attachments && post.attachments.length > 0 && (
              <PostAttachments attachments={post.attachments} />
            )}

            {/* Tags and AI Keywords List */}
            {((post.tags && post.tags.length > 0) || rawContent) && (
              <div className="mt-4 flex flex-wrap gap-1.5 items-center">
                {post.tags && post.tags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/search?tag=${encodeURIComponent(tag)}`}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-surface-600 hover:text-brand-600 bg-surface-100 hover:bg-brand-50 px-2 py-0.5 rounded-md transition-colors border border-surface-200/60"
                  >
                    <Hash className="w-3 h-3 text-surface-400" />
                    <span>{tag}</span>
                  </Link>
                ))}

                <button
                  type="button"
                  onClick={() => handleOpenSummary('keywords')}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 px-2 py-0.5 rounded-md transition-colors border border-indigo-200/70 shadow-xs"
                  title="Extract AI key concepts and topics from this post"
                >
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  <span>AI Keywords</span>
                </button>
              </div>
            )}
          </CardContent>

          {/* Card Footer: Interactive engagement bar */}
          <CardFooter className="py-2.5 px-3.5 sm:px-6 bg-surface-50/50 flex-wrap sm:flex-nowrap gap-2">
            <div className="flex items-center gap-2.5 sm:gap-5 text-xs text-surface-500 flex-wrap">
              {/* Like Action */}
              <button
                type="button"
                onClick={handleLike}
                disabled={isLikeLoading}
                aria-label={isLiked ? `Unlike post (${likesCount} likes)` : `Like post (${likesCount} likes)`}
                className={cn(
                  'flex items-center gap-1.5 transition-colors font-medium outline-none select-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded-lg px-1.5 py-1 -ml-1.5',
                  isLiked
                    ? 'text-rose-600 font-bold'
                    : 'text-surface-600 hover:text-rose-600 hover:bg-rose-50/60',
                  isLikeLoading && 'opacity-60 cursor-wait'
                )}
              >
                <Heart
                  className={cn(
                    'w-4 h-4 transition-transform active:scale-125',
                    isLiked && 'fill-rose-600 text-rose-600'
                  )}
                />
                <span>{likesCount}</span>
              </button>

              {/* Comment Action */}
              <button
                type="button"
                onClick={() => setIsCommentsOpen(true)}
                aria-label={`View and add comments (${commentsCount} comments)`}
                className="flex items-center gap-1.5 text-surface-600 hover:text-brand-600 hover:bg-brand-50/60 rounded-lg px-1.5 py-1 transition-colors font-medium select-none focus-visible:ring-2 focus-visible:ring-brand-500 outline-none"
                title="View discussion & replies"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{commentsCount}</span>
              </button>

              {/* Share Action */}
              <button
                type="button"
                onClick={handleShare}
                disabled={isShareLoading}
                aria-label={copiedShare ? 'Link copied' : `Share post (${sharesCount} shares)`}
                className={cn(
                  'flex items-center gap-1.5 transition-colors font-medium outline-none select-none rounded-lg px-1.5 py-1 focus-visible:ring-2 focus-visible:ring-brand-500',
                  copiedShare
                    ? 'text-emerald-600 font-bold'
                    : 'text-surface-600 hover:text-brand-600 hover:bg-brand-50/60'
                )}
                title={copiedShare ? 'Copied link to clipboard!' : 'Share post'}
              >
                {copiedShare ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-600 text-[11px]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>{sharesCount > 0 ? sharesCount : 'Share'}</span>
                  </>
                )}
              </button>

              {/* AI Summarize Action */}
              <button
                type="button"
                onClick={() => handleOpenSummary('summary')}
                aria-label="Summarize post with AI"
                className="flex items-center gap-1.5 text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-lg px-2.5 py-1 transition-all font-semibold select-none focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none shadow-xs"
                title="View concise AI executive summary and keywords"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Summarize</span>
              </button>

              {/* AI Quiz Action */}
              <button
                type="button"
                onClick={handleOpenQuiz}
                aria-label="Generate or take AI Quiz from this post"
                className="flex items-center gap-1.5 text-brand-700 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 border border-brand-200/80 rounded-lg px-2.5 py-1 transition-all font-semibold select-none focus-visible:ring-2 focus-visible:ring-brand-500 outline-none shadow-xs"
                title="Generate or take interactive AI Quiz"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                <span>AI Quiz</span>
              </button>
            </div>

            {/* Bookmark Action */}
            <button
              type="button"
              onClick={handleBookmark}
              disabled={isBookmarkLoading}
              aria-label={isBookmarked ? 'Remove post from bookmarks' : 'Save post to bookmarks'}
              className={cn(
                'p-1.5 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                isBookmarked
                  ? 'text-brand-600 bg-brand-50/60'
                  : 'text-surface-400 hover:text-brand-600 hover:bg-surface-100',
                isBookmarkLoading && 'opacity-60 cursor-wait'
              )}
              title={isBookmarked ? 'Saved to Bookmarks' : 'Save Bookmark'}
            >
              <Bookmark
                className={cn(
                  'w-4 h-4 transition-transform active:scale-125',
                  isBookmarked && 'fill-brand-600 text-brand-600'
                )}
              />
            </button>
          </CardFooter>
        </Card>
      </article>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        title="Delete Study Post"
        description="Are you sure you want to delete this study post? This action will permanently remove the post, attached study files, and discussion comments."
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
              onClick={handleDeletePost}
            >
              {isDeleting ? 'Deleting...' : 'Delete Post'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-surface-600">
            You are about to permanently delete:
          </p>
          <div className="p-3 rounded-xl bg-surface-50 border border-surface-200 text-xs font-semibold text-surface-900 break-words">
            &ldquo;{post.title}&rdquo;
          </div>
          {actionError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}
        </div>
      </Modal>

      {/* Post Comments Modal */}
      <CommentsModal
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        post={{ ...post, commentsCount }}
        onCountChange={(delta) => {
          setCommentsCount((prev) => {
            const next = Math.max(0, prev + delta);
            onUpdate?.({ ...post, commentsCount: next });
            return next;
          });
        }}
      />

      {/* AI Quiz Modal */}
      <QuizModal
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        post={post}
      />

      {/* AI Summary and Keywords Modal */}
      <AISummaryModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        post={post}
        initialTab={summaryInitialTab}
      />
    </>
  );
}

export default PostCard;
