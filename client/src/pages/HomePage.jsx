import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Clock,
  ArrowUpDown,
  PlusCircle,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Avatar from '@/components/common/Avatar';
import Tabs from '@/components/common/Tabs';
import Alert from '@/components/common/Alert';
import EmptyState from '@/components/common/EmptyState';
import { PostSkeleton } from '@/components/common/Skeleton';
import PostCard from '@/components/posts/PostCard';
import { getFeed } from '@/api/posts';
import { useAuth } from '@/context/AuthContext';

const SORT_OPTIONS = [
  { id: 'trending', label: 'Trending', icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { id: 'newest', label: 'Newest', icon: <Clock className="w-3.5 h-3.5" /> },
  { id: 'oldest', label: 'Oldest', icon: <ArrowUpDown className="w-3.5 h-3.5" /> },
];

export function HomePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Feed states
  const [posts, setPosts] = useState([]);
  const [sort, setSort] = useState('trending');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1, hasMore: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Fetch initial page or when sort changes
  const fetchPosts = useCallback(async (sortOption = sort, page = 1, append = false) => {
    if (page === 1) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const res = await getFeed({
        sort: sortOption,
        page,
        limit: 10,
      });

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
        throw new Error(res?.message || 'Failed to fetch study feed');
      }
    } catch (err) {
      console.error('[Feed Error]:', err);
      setError(err?.message || 'Unable to connect to the StudySync feed. Please try again.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [sort]);

  // Initial load and sort change listener
  useEffect(() => {
    fetchPosts(sort, 1, false);
  }, [sort, fetchPosts]);

  // Handle Sort Change
  const handleSortChange = (newSort) => {
    if (newSort === sort) return;
    setSort(newSort);
    // fetchPosts will be triggered by useEffect
  };

  // Handle Load More
  const handleLoadMore = () => {
    if (isLoadingMore || !pagination.hasMore) return;
    fetchPosts(sort, pagination.page + 1, true);
  };

  // Post update callback (likes, bookmarks, shares)
  const handlePostUpdate = (updatedPost) => {
    setPosts((prev) =>
      prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
    );
  };

  // Post deletion callback
  const handlePostDelete = (deletedPostId) => {
    setPosts((prev) => prev.filter((p) => p._id !== deletedPostId));
    setPagination((prev) => ({
      ...prev,
      total: Math.max(0, prev.total - 1),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Quick Post Prompt Card */}
      <Card className="p-4 bg-white border border-surface-200/90 shadow-card">
        <div className="flex items-center gap-3">
          <Avatar
            name={user?.username || 'Student'}
            src={user?.profilePicture}
            size="md"
          />
          <Link
            to="/create"
            className="flex-1 text-left px-4 py-2.5 rounded-xl bg-surface-50 border border-surface-200/80 text-xs text-surface-500 hover:bg-surface-100 hover:text-surface-700 transition-colors flex items-center justify-between group"
          >
            <span>
              {isAuthenticated
                ? `What are you revising today, @${user?.username}? Share notes or questions...`
                : 'Share study notes, ask an academic question, or post a cheat sheet...'}
            </span>
            <PlusCircle className="w-4 h-4 text-brand-600 group-hover:scale-110 transition-transform shrink-0 ml-2" />
          </Link>
        </div>
      </Card>

      {/* Feed Controls: Sort Tabs & Refresh Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <Tabs
          tabs={SORT_OPTIONS}
          activeTab={sort}
          onChange={handleSortChange}
          variant="pills"
          className="w-full sm:w-auto"
        />

        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-surface-500">
          {pagination.total > 0 && !isLoading && (
            <span className="text-[11px] text-surface-400">
              Showing {posts.length} of {pagination.total} posts
            </span>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchPosts(sort, 1, false)}
            disabled={isLoading}
            className="h-8 px-2.5 text-surface-600 hover:text-surface-900"
            title="Refresh feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Error State Banner */}
      {error && (
        <Alert
          variant="error"
          title="Could not load study feed"
          className="shadow-subtle"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPosts(sort, 1, false)}
              className="shrink-0 bg-white"
            >
              Retry Connection
            </Button>
          </div>
        </Alert>
      )}

      {/* Feed Content Stream */}
      {isLoading ? (
        /* Loading Skeletons */
        <div className="space-y-4">
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : posts.length === 0 ? (
        /* Empty Feed State */
        <EmptyState
          icon={<BookOpen className="w-6 h-6 text-brand-600" />}
          title="No study posts found"
          description={
            sort === 'trending'
              ? 'No trending study materials found at the moment. Try switching to Newest or be the first to publish a note!'
              : 'Be the first scholar in your community to share study notes, question sets, or lecture summaries!'
          }
          actionLabel="Create Study Post"
          onAction={() => navigate('/create')}
        />
      ) : (
        /* Posts Stream */
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onUpdate={handlePostUpdate}
              onDelete={handlePostDelete}
            />
          ))}

          {/* Pagination: Load More Action */}
          {pagination.hasMore && (
            <div className="pt-4 text-center">
              <Button
                variant="outline"
                size="md"
                onClick={handleLoadMore}
                isLoading={isLoadingMore}
                className="w-full sm:w-auto min-w-[200px] shadow-sm bg-white"
              >
                {isLoadingMore ? 'Loading more posts...' : 'Load More Posts'}
              </Button>
            </div>
          )}

          {!pagination.hasMore && posts.length > 5 && (
            <div className="text-center py-6 text-xs text-surface-400 border-t border-surface-200/60">
              You&apos;ve reached the end of the study feed.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HomePage;
