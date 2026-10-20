import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  Trash2,
  AlertCircle,
  Lightbulb,
  Calendar,
  Flame,
  Check,
  Hash,
  FileText,
  Tag,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Card, { CardContent, CardHeader, CardFooter } from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Avatar from '@/components/common/Avatar';
import Tabs from '@/components/common/Tabs';
import Modal from '@/components/common/Modal';
import { PostAttachments } from '@/components/posts/PostAttachment';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { QuizRunner } from '@/components/quiz/QuizRunner';
import { AISummaryCard } from '@/components/ai/AISummaryCard';
import { AIKeywordsCard } from '@/components/ai/AIKeywordsCard';
import { formatDate } from '@/utils/formatters';
import { getPost, likePost, unlikePost, bookmarkPost, unbookmarkPost, recordShare, deletePost } from '@/api/posts';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/utils/cn';

export function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const toast = useToast();

  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Engagement states
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [sharesCount, setSharesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);

  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);
  const [isShareLoading, setIsShareLoading] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // AI Suite Tabs
  const [activeAiTab, setActiveAiTab] = useState('quiz');

  const aiTabs = [
    { id: 'quiz', label: 'Interactive AI Quiz (MCQ)', icon: <Lightbulb className="w-3.5 h-3.5" /> },
    { id: 'summary', label: 'Executive Summary', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'keywords', label: 'Key Concepts & Topics', icon: <Tag className="w-3.5 h-3.5" /> },
  ];

  // Fetch real post details from backend
  useEffect(() => {
    let isMounted = true;
    async function loadPost() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await getPost(id);
        if (res && res.post && isMounted) {
          const p = res.post;
          setPost(p);
          setIsLiked(Boolean(p.isLiked));
          setLikesCount(Number(p.likesCount) || 0);
          setIsBookmarked(Boolean(p.isBookmarked));
          setSharesCount(Number(p.sharesCount) || 0);
          setCommentsCount(Number(p.commentsCount) || 0);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || 'Study post not found or could not be loaded.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (id) {
      loadPost();
    }
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Handle Like/Unlike
  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.info('Please sign in to like study posts');
      navigate('/login');
      return;
    }
    if (isLikeLoading) return;

    const prevLiked = isLiked;
    const prevCount = likesCount;
    const nextLiked = !prevLiked;
    const nextCount = nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1);

    setIsLiked(nextLiked);
    setLikesCount(nextCount);
    setIsLikeLoading(true);

    try {
      const res = nextLiked ? await likePost(id) : await unlikePost(id);
      if (res && res.likesCount !== undefined) {
        setLikesCount(res.likesCount);
        setIsLiked(Boolean(res.liked));
      }
    } catch (err) {
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
      toast.error(err?.message || 'Failed to update like status');
    } finally {
      setIsLikeLoading(false);
    }
  };

  // Handle Bookmark/Unbookmark
  const handleBookmark = async () => {
    if (!isAuthenticated) {
      toast.info('Please sign in to save study posts');
      navigate('/login');
      return;
    }
    if (isBookmarkLoading) return;

    const prevBookmarked = isBookmarked;
    const nextBookmarked = !prevBookmarked;

    setIsBookmarked(nextBookmarked);
    setIsBookmarkLoading(true);

    try {
      const res = nextBookmarked ? await bookmarkPost(id) : await unbookmarkPost(id);
      if (res) {
        const saved = Boolean(res.saved);
        setIsBookmarked(saved);
        if (saved) {
          toast.success('Post saved to bookmarks');
        } else {
          toast.info('Post removed from bookmarks');
        }
      }
    } catch (err) {
      setIsBookmarked(prevBookmarked);
      toast.error(err?.message || 'Failed to update bookmark');
    } finally {
      setIsBookmarkLoading(false);
    }
  };

  // Handle Share
  const handleShare = async () => {
    if (isShareLoading) return;
    const postUrl = window.location.href;
    let sharedNatively = false;

    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          text: post?.content ? post.content.slice(0, 140) : post?.title,
          url: postUrl,
        });
        sharedNatively = true;
        toast.success('Post shared successfully!');
      } catch (err) {
        if (err.name === 'AbortError') return;
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
        toast.error(err?.message || 'Failed to copy link');
      }
    }

    if (isAuthenticated) {
      setIsShareLoading(true);
      try {
        const res = await recordShare(id);
        if (res?.sharesCount !== undefined) {
          setSharesCount(res.sharesCount);
        }
      } catch (err) {
        console.warn('[Share Record]:', err?.message);
      } finally {
        setIsShareLoading(false);
      }
    }
  };

  // Handle Delete
  const handleDeletePost = async () => {
    setIsDeleting(true);
    try {
      await deletePost(id);
      setShowDeleteModal(false);
      toast.success('Study post deleted successfully');
      navigate('/');
    } catch (err) {
      toast.error(err?.message || 'Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCommentCountChange = (delta) => {
    setCommentsCount((prev) => Math.max(0, prev + delta));
  };

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="w-24 h-4 bg-surface-200 rounded" />
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-200" />
            <div className="space-y-1.5 flex-1">
              <div className="w-32 h-3.5 bg-surface-200 rounded" />
              <div className="w-20 h-2.5 bg-surface-200 rounded" />
            </div>
          </div>
          <div className="w-3/4 h-6 bg-surface-200 rounded" />
          <div className="space-y-2 pt-2">
            <div className="w-full h-3 bg-surface-200 rounded" />
            <div className="w-full h-3 bg-surface-200 rounded" />
            <div className="w-2/3 h-3 bg-surface-200 rounded" />
          </div>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !post) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-surface-900">Post Not Found</h2>
        <p className="text-xs text-surface-500 max-w-sm mx-auto">
          {error || 'The study post you are looking for may have been removed or does not exist.'}
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Return to Home Feed
        </Button>
      </div>
    );
  }

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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-surface-600 hover:text-brand-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Feed
      </button>

      {/* Main Post Article Card */}
      <Card>
        <CardHeader className="py-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link to={`/users/${author.username}`} className="shrink-0">
                <Avatar
                  name={author.username}
                  src={author.profilePicture}
                  size="md"
                />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    to={`/users/${author.username}`}
                    className="text-xs font-bold text-surface-900 hover:text-brand-600 transition-colors"
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
                  <Calendar className="w-3 h-3" />
                  <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
                </div>
              </div>
            </div>

            {/* Top right actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleBookmark}
                disabled={isBookmarkLoading}
                aria-label={isBookmarked ? 'Remove bookmark' : 'Save bookmark'}
                className={cn(
                  'p-2 rounded-lg transition-colors border outline-none',
                  isBookmarked
                    ? 'text-brand-600 bg-brand-50 border-brand-200'
                    : 'text-surface-500 border-surface-200 hover:text-brand-600 hover:bg-surface-50'
                )}
                title={isBookmarked ? 'Saved to Bookmarks' : 'Save Bookmark'}
              >
                <Bookmark
                  className={cn(
                    'w-4 h-4',
                    isBookmarked && 'fill-brand-600 text-brand-600'
                  )}
                />
              </button>

              {canDelete && (
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  aria-label="Delete study post"
                  className="p-2 rounded-lg text-surface-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                  title="Delete post"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <h1 className="text-lg sm:text-xl font-bold text-surface-900 leading-snug tracking-tight">
            {post.title}
          </h1>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  to={`/search?tag=${encodeURIComponent(tag)}`}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-surface-600 hover:text-brand-600 bg-surface-100 hover:bg-brand-50 px-2 py-0.5 rounded-md transition-colors border border-surface-200/60"
                >
                  <Hash className="w-3 h-3 text-surface-400" />
                  <span>{tag}</span>
                </Link>
              ))}
            </div>
          )}
        </CardHeader>

        <CardContent className="py-5 border-t border-surface-100">
          {/* Post Content */}
          {post.content && (
            <div className="prose prose-sm max-w-none text-surface-800 whitespace-pre-wrap text-xs sm:text-sm leading-relaxed break-words">
              {post.content}
            </div>
          )}

          {/* Post Attachments */}
          {post.attachments && post.attachments.length > 0 && (
            <div className="mt-4">
              <PostAttachments attachments={post.attachments} />
            </div>
          )}
        </CardContent>

        {/* Post Engagement Bar */}
        <CardFooter className="py-3 bg-surface-50/60 border-t border-surface-100">
          <div className="flex items-center justify-between w-full text-xs text-surface-500">
            <div className="flex items-center gap-5">
              {/* Like Button */}
              <button
                type="button"
                onClick={handleLike}
                disabled={isLikeLoading}
                aria-label={isLiked ? `Unlike post (${likesCount} likes)` : `Like post (${likesCount} likes)`}
                className={cn(
                  'flex items-center gap-1.5 transition-colors font-medium outline-none select-none rounded-lg px-2 py-1',
                  isLiked
                    ? 'text-rose-600 font-bold'
                    : 'text-surface-600 hover:text-rose-600 hover:bg-rose-50/60'
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

              {/* Comments count indicator */}
              <div className="flex items-center gap-1.5 text-surface-600 font-medium px-2 py-1">
                <MessageSquare className="w-4 h-4" />
                <span>{commentsCount} comments</span>
              </div>

              {/* Share Button */}
              <button
                type="button"
                onClick={handleShare}
                disabled={isShareLoading}
                aria-label={copiedShare ? 'Link copied' : `Share post (${sharesCount} shares)`}
                className={cn(
                  'flex items-center gap-1.5 transition-colors font-medium outline-none select-none rounded-lg px-2 py-1',
                  copiedShare
                    ? 'text-emerald-600 font-bold'
                    : 'text-surface-600 hover:text-brand-600 hover:bg-brand-50/60'
                )}
              >
                {copiedShare ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-600">Copied link!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>{sharesCount > 0 ? `${sharesCount} shares` : 'Share'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* AI Study Suite Integration Section */}
      <Card className="border border-brand-200/90 shadow-card overflow-hidden">
        <div className="bg-gradient-to-r from-brand-50 to-indigo-50/60 p-4 border-b border-brand-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-brand-900">StudySync AI Study Suite</h3>
              <p className="text-[11px] text-brand-700">Interactive summaries, keywords, and practice quizzes</p>
            </div>
          </div>
          <Badge variant="brand" size="sm">
            AI Assistant
          </Badge>
        </div>

        <div className="p-5 space-y-4">
          <Tabs
            tabs={aiTabs}
            activeTab={activeAiTab}
            onChange={setActiveAiTab}
            variant="pills"
          />

          {activeAiTab === 'quiz' ? (
            <div className="pt-1">
              <QuizRunner
                postId={post._id}
                postTitle={post.title}
                isEmbedded
              />
            </div>
          ) : activeAiTab === 'summary' ? (
            <div className="pt-1">
              <AISummaryCard
                postId={post._id}
                postTitle={post.title}
                isEmbedded
              />
            </div>
          ) : (
            <div className="pt-1">
              <AIKeywordsCard
                postId={post._id}
                postTitle={post.title}
                isEmbedded
              />
            </div>
          )}
        </div>
      </Card>

      {/* Complete Peer Discussion & Comments Section */}
      <Card className="p-5 sm:p-6">
        <CommentsSection
          postId={id}
          initialCount={commentsCount}
          onCountChange={handleCommentCountChange}
          showHeader
        />
      </Card>

      {/* Delete Post Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        title="Delete Study Post"
        description="Are you sure you want to delete this study post? This action will permanently remove the post, attached files, and all discussion comments."
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
        </div>
      </Modal>
    </div>
  );
}

export default PostDetailPage;
