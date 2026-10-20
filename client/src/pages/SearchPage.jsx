import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search as SearchIcon,
  X,
  FileText,
  Users,
  Hash,
  Sparkles,
  ArrowUpDown,
  Filter,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  LayoutList,
  LayoutGrid,
  BookOpen,
} from 'lucide-react';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import Tabs from '@/components/common/Tabs';
import Alert from '@/components/common/Alert';
import EmptyState from '@/components/common/EmptyState';
import { PostSkeleton, Skeleton } from '@/components/common/Skeleton';
import PostCard from '@/components/posts/PostCard';
import UserSearchCard from '@/components/search/UserSearchCard';
import TagSearchCard from '@/components/search/TagSearchCard';
import { search, searchPosts, searchUsers, searchTags } from '@/api/search';

const SEARCH_TABS = [
  { id: 'all', label: 'All Results', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'posts', label: 'Study Posts', icon: <FileText className="w-4 h-4" /> },
  { id: 'users', label: 'Students', icon: <Users className="w-4 h-4" /> },
  { id: 'tags', label: 'Topics & Tags', icon: <Hash className="w-4 h-4" /> },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Best Match (Relevance)' },
  { value: 'newest', label: 'Newest First' },
  { value: 'trending', label: 'Most Trending' },
  { value: 'oldest', label: 'Oldest First' },
];

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Read URL params as source of truth
  const currentQ = searchParams.get('q') || '';
  const currentType = searchParams.get('type') || 'all';
  const currentSort = searchParams.get('sort') || 'relevance';
  const currentTag = searchParams.get('tag') || '';

  // Local state for responsive typing and debouncing
  const [searchInput, setSearchInput] = useState(currentQ);
  const debounceTimerRef = useRef(null);

  // Layout view mode
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

  // Results state
  const [posts, setPosts] = useState([]);
  const [postsPagination, setPostsPagination] = useState({ page: 1, limit: 10, total: 0, hasMore: false });

  const [users, setUsers] = useState([]);
  const [usersPagination, setUsersPagination] = useState({ page: 1, limit: 10, total: 0, hasMore: false });

  const [tags, setTags] = useState([]);
  const [tagsPagination, setTagsPagination] = useState({ page: 1, limit: 10, total: 0, hasMore: false });

  // Popular/Trending tags for discover state
  const [popularTags, setPopularTags] = useState([]);

  // Loading & error states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Synchronize local input if URL query changes externally (e.g. from TopBar)
  useEffect(() => {
    setSearchInput(currentQ);
  }, [currentQ]);

  // Fetch top tags for discover state on mount
  useEffect(() => {
    searchTags({ limit: 10 })
      .then((res) => {
        if (res?.success && Array.isArray(res.tags)) {
          setPopularTags(res.tags);
        }
      })
      .catch(() => {
        // Fallback default tags if endpoint is unreachable
        setPopularTags([
          { tag: 'algorithms', postCount: 14 },
          { tag: 'calculus', postCount: 11 },
          { tag: 'neuroscience', postCount: 9 },
          { tag: 'data-structures', postCount: 8 },
          { tag: 'organic-chem', postCount: 6 },
          { tag: 'physics', postCount: 5 },
        ]);
      });
  }, []);

  // Update URL helper
  const updateUrlParams = useCallback(
    (updates = {}) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === null || value === '' || (key === 'type' && value === 'all')) {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  // Debounced input change handler
  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      updateUrlParams({ q: val.trim() });
    }, 400);
  };

  // Immediate Enter-to-search or submit button click
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    updateUrlParams({ q: searchInput.trim() });
  };

  // Clear search input and URL param
  const handleClearInput = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSearchInput('');
    updateUrlParams({ q: '' });
  };

  // Clear active tag filter
  const handleClearTagFilter = () => {
    updateUrlParams({ tag: '' });
  };

  // Tab change handler
  const handleTabChange = (newTabId) => {
    updateUrlParams({ type: newTabId });
  };

  // Sort change handler
  const handleSortChange = (newSort) => {
    updateUrlParams({ sort: newSort });
  };

  // Select tag helper (e.g. from tag results or chips)
  const handleSelectTag = (tagName) => {
    updateUrlParams({ tag: tagName, type: 'posts' });
  };

  // Main search fetcher
  const executeSearch = useCallback(
    async (page = 1, append = false) => {
      const q = currentQ.trim();
      const type = currentType;
      const sort = currentSort;
      const tag = currentTag;

      // If no query and no tag, clear results to display discovery section
      if (!q && !tag) {
        setPosts([]);
        setUsers([]);
        setTags([]);
        setIsLoading(false);
        setIsLoadingMore(false);
        return;
      }

      if (page === 1) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      try {
        if (type === 'all') {
          // Unified Search endpoint
          const res = await search({ q, type: 'all', sort, tag, page, limit: 10 });
          if (res?.success) {
            setPosts(res.posts || []);
            setPostsPagination(res.postsPagination || { total: res.posts?.length || 0, hasMore: false });

            setUsers(res.users || []);
            setUsersPagination(res.usersPagination || { total: res.users?.length || 0, hasMore: false });

            setTags(res.tags || []);
            setTagsPagination(res.tagsPagination || { total: res.tags?.length || 0, hasMore: false });
          } else {
            throw new Error(res?.message || 'Search failed');
          }
        } else if (type === 'posts') {
          // Dedicated Post Search
          const res = await searchPosts({ q, sort, tag, page, limit: 10 });
          if (res?.success) {
            setPosts((prev) => (append ? [...prev, ...res.posts] : res.posts || []));
            setPostsPagination(res.pagination || { total: res.posts?.length || 0, hasMore: false });
          } else {
            throw new Error(res?.message || 'Failed to search posts');
          }
        } else if (type === 'users') {
          // Dedicated User Search
          const res = await searchUsers({ q, page, limit: 12 });
          if (res?.success) {
            setUsers((prev) => (append ? [...prev, ...res.users] : res.users || []));
            setUsersPagination(res.pagination || { total: res.users?.length || 0, hasMore: false });
          } else {
            throw new Error(res?.message || 'Failed to search students');
          }
        } else if (type === 'tags') {
          // Dedicated Tag Search
          const res = await searchTags({ q, page, limit: 16 });
          if (res?.success) {
            setTags((prev) => (append ? [...prev, ...res.tags] : res.tags || []));
            setTagsPagination(res.pagination || { total: res.tags?.length || 0, hasMore: false });
          } else {
            throw new Error(res?.message || 'Failed to search topics');
          }
        }
      } catch (err) {
        console.error('[Search Execution Error]:', err);
        setError(err?.message || 'Unable to retrieve search results. Please check your network and try again.');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [currentQ, currentType, currentSort, currentTag]
  );

  // Trigger search whenever search parameters change
  useEffect(() => {
    executeSearch(1, false);
  }, [executeSearch]);

  // Post list interaction handlers
  const handlePostUpdate = (updatedPost) => {
    setPosts((prev) => prev.map((p) => (p._id === updatedPost._id ? updatedPost : p)));
  };

  const handlePostDelete = (deletedPostId) => {
    setPosts((prev) => prev.filter((p) => p._id !== deletedPostId));
    setPostsPagination((prev) => ({
      ...prev,
      total: Math.max(0, prev.total - 1),
    }));
  };

  // Pagination Load More handlers
  const handleLoadMorePosts = () => {
    if (isLoadingMore || !postsPagination.hasMore) return;
    executeSearch((postsPagination.page || 1) + 1, true);
  };

  const handleLoadMoreUsers = () => {
    if (isLoadingMore || !usersPagination.hasMore) return;
    executeSearch((usersPagination.page || 1) + 1, true);
  };

  const handleLoadMoreTags = () => {
    if (isLoadingMore || !tagsPagination.hasMore) return;
    executeSearch((tagsPagination.page || 1) + 1, true);
  };

  // Compute total counts for Tab badges
  const tabsWithCounts = SEARCH_TABS.map((tab) => {
    if (tab.id === 'posts' && postsPagination.total > 0) {
      return { ...tab, count: postsPagination.total };
    }
    if (tab.id === 'users' && usersPagination.total > 0) {
      return { ...tab, count: usersPagination.total };
    }
    if (tab.id === 'tags' && tagsPagination.total > 0) {
      return { ...tab, count: tagsPagination.total };
    }
    return tab;
  });

  const hasSearchTarget = Boolean(currentQ.trim() || currentTag.trim());
  const isUnified = currentType === 'all';
  const totalResultsCount =
    (postsPagination.total || 0) + (usersPagination.total || 0) + (tagsPagination.total || 0);

  return (
    <div className="space-y-6">
      {/* ── Search Header & Bar ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-surface-900 tracking-tight">
            Explore StudySync Knowledge
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Search verified study notes, discussion questions, topic tags, and peer scholars.
          </p>
        </div>

        {/* Search Input Box */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white border border-surface-200/90 shadow-card">
          <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <SearchIcon className="w-4 h-4 text-surface-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={handleInputChange}
                placeholder="Search by keywords, formulas, topics (#tag), or usernames..."
                className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-surface-50 hover:bg-surface-100/70 focus:bg-white border border-surface-200 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-surface-400"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearInput}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-surface-700 rounded-lg hover:bg-surface-100 transition-colors"
                  title="Clear search query"
                  aria-label="Clear search query"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="h-10 px-4 text-xs shrink-0"
            >
              Search
            </Button>
          </form>

          {/* Active Tag Filter Pill */}
          {currentTag && (
            <div className="mt-3 pt-3 border-t border-surface-100 flex items-center gap-2">
              <span className="text-[11px] text-surface-500 font-medium">Filtering by tag:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
                <Hash className="w-3 h-3 text-brand-600" />
                <span>{currentTag}</span>
                <button
                  type="button"
                  onClick={handleClearTagFilter}
                  className="p-0.5 hover:bg-brand-100 rounded text-brand-600 hover:text-brand-900 transition-colors"
                  title="Remove tag filter"
                  aria-label="Remove tag filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs Navigation ──────────────────────────────────────────────── */}
      {hasSearchTarget && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Tabs
            tabs={tabsWithCounts}
            activeTab={currentType}
            onChange={handleTabChange}
            variant="line"
            className="overflow-x-auto"
          />

          {/* Post Sort & View mode controls (when on posts tab or unified posts) */}
          {(currentType === 'posts' || (currentType === 'all' && posts.length > 0)) && (
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {currentType === 'posts' && (
                <div className="flex items-center gap-1.5 text-xs bg-white px-2.5 py-1.5 rounded-xl border border-surface-200 shadow-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-surface-400 shrink-0" />
                  <select
                    value={currentSort}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-surface-800 focus:outline-none cursor-pointer pr-1"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Grid / List switcher */}
              <div className="flex items-center gap-1 p-0.5 bg-surface-100 rounded-xl border border-surface-200/80">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-brand-700 shadow-xs font-bold'
                      : 'text-surface-400 hover:text-surface-700'
                  }`}
                  title="List View"
                  aria-label="List View"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white text-brand-700 shadow-xs font-bold'
                      : 'text-surface-400 hover:text-surface-700'
                  }`}
                  title="Grid View"
                  aria-label="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Error Banner ─────────────────────────────────────────────────── */}
      {error && (
        <Alert variant="error" title="Search Error">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => executeSearch(1, false)}
              className="bg-white shrink-0"
            >
              Retry Search
            </Button>
          </div>
        </Alert>
      )}

      {/* ── STATE 1: Discover / Idle (No Query & No Tag) ─────────────────── */}
      {!hasSearchTarget && (
        <div className="space-y-6">
          {/* Quick Popular Topics Section */}
          <div className="p-6 rounded-2xl bg-white border border-surface-200/90 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-surface-900">Trending Academic Topics</h3>
                  <p className="text-xs text-surface-500">Popular study subject tags with verified student notes</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleTabChange('tags')}
                className="text-xs text-brand-600 hover:text-brand-700"
              >
                <span>Browse All Topics</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
              {popularTags.map((item) => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => handleSelectTag(item.tag)}
                  className="p-3 rounded-xl bg-surface-50 hover:bg-brand-50/60 border border-surface-200/80 hover:border-brand-200 text-left transition-all group flex flex-col justify-between"
                >
                  <span className="text-xs font-bold text-surface-900 group-hover:text-brand-600 transition-colors truncate">
                    #{item.tag}
                  </span>
                  <span className="text-[10px] text-surface-500 mt-1">
                    {item.postCount} {item.postCount === 1 ? 'post' : 'posts'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Knowledge Pillars Callout Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-surface-50 border border-surface-200/80 space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-2">
                <FileText className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-surface-900">Course Notes & Formula Sheets</h4>
              <p className="text-[11px] text-surface-500 leading-relaxed">
                Full-text search indexed across student titles, content summaries, and attached documents.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-50 border border-surface-200/80 space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-2">
                <Users className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-surface-900">Peer Scholars & Contributors</h4>
              <p className="text-[11px] text-surface-500 leading-relaxed">
                Find classmates by username, compare academic levels, study streaks, and shared materials.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-50 border border-surface-200/80 space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-2">
                <Hash className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-surface-900">Subject Tags & Curricula</h4>
              <p className="text-[11px] text-surface-500 leading-relaxed">
                Explore concentrated subject hubs across STEM, humanities, and exam revision topics.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── STATE 2: Loading Skeletons ───────────────────────────────────── */}
      {hasSearchTarget && isLoading && (
        <div className="space-y-4">
          <PostSkeleton />
          <PostSkeleton />
        </div>
      )}

      {/* ── STATE 3: Empty Search Results ─────────────────────────────────── */}
      {hasSearchTarget && !isLoading && !error && (
        <>
          {/* Empty All Results */}
          {isUnified && posts.length === 0 && users.length === 0 && tags.length === 0 && (
            <EmptyState
              icon={<SearchIcon className="w-8 h-8 text-brand-600" />}
              title={`No matches found for "${currentQ}"`}
              description="Try adjusting your keywords, checking for typos, or removing the tag filter to broaden your search."
              actionLabel="Clear Search Query"
              onAction={handleClearInput}
            />
          )}

          {/* Empty Posts Tab */}
          {currentType === 'posts' && posts.length === 0 && (
            <EmptyState
              icon={<FileText className="w-8 h-8 text-brand-600" />}
              title="No study posts found"
              description={`We couldn't find any published notes matching your criteria ${
                currentTag ? `in #${currentTag}` : ''
              }.`}
              actionLabel={currentTag ? 'Clear Tag Filter' : 'Clear Search'}
              onAction={currentTag ? handleClearTagFilter : handleClearInput}
            />
          )}

          {/* Empty Users Tab */}
          {currentType === 'users' && users.length === 0 && (
            <EmptyState
              icon={<Users className="w-8 h-8 text-brand-600" />}
              title="No student scholars found"
              description={`No student accounts match the username query "${currentQ}".`}
              actionLabel="Clear Search"
              onAction={handleClearInput}
            />
          )}

          {/* Empty Tags Tab */}
          {currentType === 'tags' && tags.length === 0 && (
            <EmptyState
              icon={<Hash className="w-8 h-8 text-brand-600" />}
              title="No topic tags found"
              description={`No subject tags currently match "${currentQ}".`}
              actionLabel="Browse Popular Topics"
              onAction={handleClearInput}
            />
          )}
        </>
      )}

      {/* ── STATE 4: Search Results Streams ───────────────────────────────── */}
      {hasSearchTarget && !isLoading && !error && (
        <>
          {/* ── TAB: ALL (Unified View) ───────────────────────────────────── */}
          {isUnified && (
            <div className="space-y-8">
              {/* 1. Posts Section Preview */}
              {posts.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-surface-200/80">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-brand-600" />
                      <h2 className="text-sm font-bold text-surface-900">
                        Study Posts ({postsPagination.total})
                      </h2>
                    </div>
                    {postsPagination.total > posts.length && (
                      <button
                        type="button"
                        onClick={() => handleTabChange('posts')}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1"
                      >
                        <span>View all {postsPagination.total} posts</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
                    {posts.slice(0, 4).map((post) => (
                      <PostCard
                        key={post._id}
                        post={post}
                        onUpdate={handlePostUpdate}
                        onDelete={handlePostDelete}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* 2. Users Section Preview */}
              {users.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-surface-200/80">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <h2 className="text-sm font-bold text-surface-900">
                        Students & Scholars ({usersPagination.total})
                      </h2>
                    </div>
                    {usersPagination.total > users.length && (
                      <button
                        type="button"
                        onClick={() => handleTabChange('users')}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1"
                      >
                        <span>View all {usersPagination.total} students</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.slice(0, 3).map((user) => (
                      <UserSearchCard key={user._id} user={user} />
                    ))}
                  </div>
                </section>
              )}

              {/* 3. Topics Section Preview */}
              {tags.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-surface-200/80">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-emerald-600" />
                      <h2 className="text-sm font-bold text-surface-900">
                        Related Topics ({tagsPagination.total})
                      </h2>
                    </div>
                    {tagsPagination.total > tags.length && (
                      <button
                        type="button"
                        onClick={() => handleTabChange('tags')}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1"
                      >
                        <span>View all {tagsPagination.total} topics</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {tags.slice(0, 4).map((tag) => (
                      <TagSearchCard key={tag.tag} tag={tag} onSelect={handleSelectTag} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ── TAB: POSTS ────────────────────────────────────────────────── */}
          {currentType === 'posts' && posts.length > 0 && (
            <div className="space-y-4">
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
                {posts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    onUpdate={handlePostUpdate}
                    onDelete={handlePostDelete}
                  />
                ))}
              </div>

              {/* Load More Posts */}
              {postsPagination.hasMore && (
                <div className="pt-4 text-center">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={handleLoadMorePosts}
                    isLoading={isLoadingMore}
                    disabled={isLoadingMore}
                    className="w-full sm:w-auto min-w-[200px] bg-white shadow-xs"
                  >
                    {isLoadingMore ? 'Loading More Posts...' : 'Load More Posts'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: USERS ────────────────────────────────────────────────── */}
          {currentType === 'users' && users.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map((user) => (
                  <UserSearchCard key={user._id} user={user} />
                ))}
              </div>

              {/* Load More Students */}
              {usersPagination.hasMore && (
                <div className="pt-4 text-center">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={handleLoadMoreUsers}
                    isLoading={isLoadingMore}
                    disabled={isLoadingMore}
                    className="w-full sm:w-auto min-w-[200px] bg-white shadow-xs"
                  >
                    {isLoadingMore ? 'Loading More Students...' : 'Load More Students'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: TAGS / TOPICS ────────────────────────────────────────── */}
          {currentType === 'tags' && tags.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {tags.map((tag) => (
                  <TagSearchCard key={tag.tag} tag={tag} onSelect={handleSelectTag} />
                ))}
              </div>

              {/* Load More Topics */}
              {tagsPagination.hasMore && (
                <div className="pt-4 text-center">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={handleLoadMoreTags}
                    isLoading={isLoadingMore}
                    disabled={isLoadingMore}
                    className="w-full sm:w-auto min-w-[200px] bg-white shadow-xs"
                  >
                    {isLoadingMore ? 'Loading More Topics...' : 'Load More Topics'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SearchPage;
