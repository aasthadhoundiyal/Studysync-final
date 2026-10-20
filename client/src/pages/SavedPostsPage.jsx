import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, RefreshCw, LayoutList, LayoutGrid } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import Alert from '@/components/common/Alert';
import { PostSkeleton } from '@/components/common/Skeleton';
import PostCard from '@/components/posts/PostCard';
import { getBookmarks } from '@/api/users';

export function SavedPostsPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1, hasMore: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const fetchBookmarks = useCallback(async (page = 1, append = false) => {
    if (page === 1) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const res = await getBookmarks({ page, limit: 10 });
      if (res?.success) {
        setPosts((prev) => (append ? [...prev, ...res.posts] : res.posts));
        setPagination(
          res.pagination || {
            page,
            limit: 10,
            total: res.posts?.length || 0,
            totalPages: 1,
            hasMore: false,
          }
        );
      } else {
        throw new Error(res?.message || 'Failed to fetch saved bookmarks');
      }
    } catch (err) {
      console.error('[Bookmarks Error]:', err);
      setError(err?.message || 'Unable to load saved bookmarks. Please try again.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchBookmarks(1, false);
  }, [fetchBookmarks]);

  const handlePostUpdate = (updatedPost) => {
    if (!updatedPost.isBookmarked) {
      // If unbookmarked on the bookmarks page, remove it from the list
      setPosts((prev) => prev.filter((p) => p._id !== updatedPost._id));
      setPagination((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));
    } else {
      setPosts((prev) =>
        prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
      );
    }
  };

  const handlePostDelete = (deletedPostId) => {
    setPosts((prev) => prev.filter((p) => p._id !== deletedPostId));
    setPagination((prev) => ({
      ...prev,
      total: Math.max(0, prev.total - 1),
    }));
  };

  const handleLoadMore = () => {
    if (isLoadingMore || !pagination.hasMore) return;
    fetchBookmarks(pagination.page + 1, true);
  };

  return (
    <PageContainer
      title="Saved Bookmarks"
      subtitle="Access your bookmarked study guides, practice questions, and formula sheets offline anytime."
      badge={
        !isLoading && pagination.total > 0 ? (
          <Badge variant="primary" size="md">
            {pagination.total} {pagination.total === 1 ? 'Bookmark' : 'Bookmarks'}
          </Badge>
        ) : null
      }
      actions={
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-surface-100/80 p-0.5 rounded-lg border border-surface-200/80">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-brand-700 shadow-xs font-bold'
                  : 'text-surface-500 hover:text-surface-900'
              }`}
              title="List View"
              aria-label="List View"
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-brand-700 shadow-xs font-bold'
                  : 'text-surface-500 hover:text-surface-900'
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchBookmarks(1, false)}
            disabled={isLoading}
            className="h-8 px-2.5 text-surface-600 hover:text-surface-900"
            title="Refresh bookmarks"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      }
    >
      {/* Error Alert */}
      {error && (
        <Alert variant="error" title="Could not load bookmarks" className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchBookmarks(1, false)}
              className="shrink-0 bg-white"
            >
              Retry
            </Button>
          </div>
        </Alert>
      )}

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="space-y-4">
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : posts.length === 0 ? (
        /* Empty State */
        <EmptyState
          icon={<Bookmark className="w-6 h-6 text-brand-600" />}
          title="No bookmarks saved yet"
          description="Whenever you find useful study notes on the feed, tap the bookmark icon on any post to save it for quick revision here."
          actionLabel="Explore Feed"
          onAction={() => navigate('/')}
        />
      ) : (
        /* Posts Stream */
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onUpdate={handlePostUpdate}
              onDelete={handlePostDelete}
            />
          ))}

          {/* Load More Button */}
          {pagination.hasMore && (
            <div className="pt-4 text-center">
              <Button
                variant="outline"
                size="md"
                onClick={handleLoadMore}
                isLoading={isLoadingMore}
                className="w-full sm:w-auto min-w-[200px] shadow-sm bg-white"
              >
                {isLoadingMore ? 'Loading more bookmarks...' : 'Load More Bookmarks'}
              </Button>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}

export default SavedPostsPage;
