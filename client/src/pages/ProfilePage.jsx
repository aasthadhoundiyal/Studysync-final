import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User,
  Calendar,
  Flame,
  Award,
  Edit3,
  Bookmark,
  FileText,
  MessageSquare,
  Share2,
  Mail,
  ShieldCheck,
  RotateCcw,
  RefreshCw,
  LayoutList,
  LayoutGrid,
  Star,
  Activity,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Avatar from '@/components/common/Avatar';
import Badge from '@/components/common/Badge';
import Tabs from '@/components/common/Tabs';
import Alert from '@/components/common/Alert';
import EmptyState from '@/components/common/EmptyState';
import { PostSkeleton } from '@/components/common/Skeleton';
import PostCard from '@/components/posts/PostCard';
import EditProfileModal from '@/components/profile/EditProfileModal';
import RestoreStreakModal from '@/components/profile/RestoreStreakModal';
import LevelMilestonesModal from '@/components/profile/LevelMilestonesModal';
import PointsProgressCard from '@/components/profile/PointsProgressCard';
import StreakCard from '@/components/profile/StreakCard';
import { getProfile, getMe, getUserPosts, getBookmarks } from '@/api/users';
import { formatDate } from '@/utils/formatters';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export function ProfilePage() {
  const { identifier } = useParams();
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated } = useAuth();
  const toast = useToast();

  // Profile data states
  const [profile, setProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(null);

  // Active Tab & View Mode
  const [activeTab, setActiveTab] = useState('posts');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

  // Posts stream states
  const [posts, setPosts] = useState([]);
  const [postsSort, setPostsSort] = useState('newest');
  const [postsPagination, setPostsPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1, hasMore: false });
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const [postsError, setPostsError] = useState(null);

  // Bookmarks stream states (for owner)
  const [bookmarks, setBookmarks] = useState([]);
  const [bookmarksPagination, setBookmarksPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1, hasMore: false });
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);
  const [isLoadingMoreBookmarks, setIsLoadingMoreBookmarks] = useState(false);
  const [bookmarksError, setBookmarksError] = useState(null);

  // Modal dialog states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showMilestonesModal, setShowMilestonesModal] = useState(false);

  // Check if viewing own profile
  const isOwnProfile = Boolean(
    profile?.isOwnProfile ||
    (!identifier && isAuthenticated) ||
    (authUser && identifier && (
      authUser.username?.toLowerCase() === identifier.toLowerCase() ||
      authUser._id === identifier ||
      authUser.id === identifier
    ))
  );

  // 1. Fetch Profile Data
  const loadProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    setProfileError(null);

    try {
      let res;
      if (identifier) {
        res = await getProfile(identifier);
      } else {
        if (!isAuthenticated) {
          navigate('/login');
          return;
        }
        res = await getMe();
      }

      if (res?.success && res?.profile) {
        setProfile(res.profile);
      } else {
        throw new Error(res?.message || 'Failed to load user profile');
      }
    } catch (err) {
      console.error('[Profile Load Error]:', err);
      setProfileError(
        err?.status === 404
          ? 'This student profile could not be found or has been suspended.'
          : err?.message || 'Unable to load profile. Please try again.'
      );
    } finally {
      setIsLoadingProfile(false);
    }
  }, [identifier, isAuthenticated, navigate]);

  useEffect(() => {
    setPosts([]);
    setBookmarks([]);
    setPostsPagination({ page: 1, limit: 10, total: 0, totalPages: 1, hasMore: false });
    setBookmarksPagination({ page: 1, limit: 10, total: 0, totalPages: 1, hasMore: false });
    loadProfile();
  }, [loadProfile, identifier]);

  useEffect(() => {
    if (!isOwnProfile && activeTab === 'saved') {
      setActiveTab('posts');
    }
  }, [isOwnProfile, activeTab]);

  // 2. Fetch User Posts
  const fetchUserPosts = useCallback(async (targetIdentifier, page = 1, append = false, sort = postsSort) => {
    if (!targetIdentifier) return;

    if (page === 1) {
      setIsLoadingPosts(true);
      setPostsError(null);
    } else {
      setIsLoadingMorePosts(true);
    }

    try {
      const res = await getUserPosts(targetIdentifier, { page, limit: 10, sort });
      if (res?.success) {
        setPosts((prev) => (append ? [...prev, ...res.posts] : res.posts));
        setPostsPagination(
          res.pagination || {
            page,
            limit: 10,
            total: res.posts?.length || 0,
            totalPages: 1,
            hasMore: false,
          }
        );
      } else {
        throw new Error(res?.message || 'Failed to load user posts');
      }
    } catch (err) {
      console.error('[User Posts Error]:', err);
      setPostsError(err?.message || 'Unable to load posts for this profile.');
    } finally {
      setIsLoadingPosts(false);
      setIsLoadingMorePosts(false);
    }
  }, [postsSort]);

  // Fetch posts whenever profile successfully loads
  useEffect(() => {
    if (profile?.username) {
      fetchUserPosts(profile.username, 1, false, postsSort);
    }
  }, [profile?.username, postsSort, fetchUserPosts]);

  // 3. Fetch Saved Posts (Bookmarks) if owner and tab selected
  const fetchOwnerBookmarks = useCallback(async (page = 1, append = false) => {
    if (!isOwnProfile) return;

    if (page === 1) {
      setIsLoadingBookmarks(true);
      setBookmarksError(null);
    } else {
      setIsLoadingMoreBookmarks(true);
    }

    try {
      const res = await getBookmarks({ page, limit: 10 });
      if (res?.success) {
        setBookmarks((prev) => (append ? [...prev, ...res.posts] : res.posts));
        setBookmarksPagination(
          res.pagination || {
            page,
            limit: 10,
            total: res.posts?.length || 0,
            totalPages: 1,
            hasMore: false,
          }
        );
      } else {
        throw new Error(res?.message || 'Failed to load bookmarks');
      }
    } catch (err) {
      console.error('[Profile Bookmarks Error]:', err);
      setBookmarksError(err?.message || 'Unable to load saved bookmarks.');
    } finally {
      setIsLoadingBookmarks(false);
      setIsLoadingMoreBookmarks(false);
    }
  }, [isOwnProfile]);

  useEffect(() => {
    if (activeTab === 'saved' && isOwnProfile && bookmarks.length === 0) {
      fetchOwnerBookmarks(1, false);
    }
  }, [activeTab, isOwnProfile, bookmarks.length, fetchOwnerBookmarks]);

  // Post list update handlers
  const handlePostUpdate = (updatedPost) => {
    setPosts((prev) =>
      prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
    );
  };

  const handlePostDelete = (deletedPostId) => {
    setPosts((prev) => prev.filter((p) => p._id !== deletedPostId));
    setPostsPagination((prev) => ({
      ...prev,
      total: Math.max(0, prev.total - 1),
    }));
    setProfile((prev) => (prev ? { ...prev, postsCount: Math.max(0, (prev.postsCount || 1) - 1) } : prev));
  };

  // Bookmark list update handlers
  const handleBookmarkUpdate = (updatedPost) => {
    if (!updatedPost.isBookmarked) {
      setBookmarks((prev) => prev.filter((p) => p._id !== updatedPost._id));
      setBookmarksPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    } else {
      setBookmarks((prev) => prev.map((p) => (p._id === updatedPost._id ? updatedPost : p)));
    }
  };

  const handleBookmarkDelete = (deletedPostId) => {
    setBookmarks((prev) => prev.filter((p) => p._id !== deletedPostId));
    setBookmarksPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
  };

  // Profile update callback
  const handleProfileUpdated = (newProfile) => {
    setProfile((prev) => ({ ...prev, ...newProfile }));
    if (identifier && newProfile.username && newProfile.username.toLowerCase() !== identifier.toLowerCase()) {
      navigate(`/users/${newProfile.username}`, { replace: true });
    }
  };

  // Streak restored callback
  const handleStreakRestored = (newStreak) => {
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            currentStreak: newStreak.currentStreak,
            longestStreak: newStreak.longestStreak,
            postedToday: newStreak.postedToday,
            isStreakAlive: newStreak.isStreakAlive,
            streakRestoresRemaining: newStreak.streakRestoresRemaining,
          }
        : prev
    );
  };

  const handleShareProfile = async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast.success('Profile link copied to clipboard!');
      } else {
        toast.info(url);
      }
    } catch {
      toast.info(url);
    }
  };

  // Tabs configuration matching minimal clean mockup
  const tabs = [
    {
      id: 'posts',
      label: isOwnProfile ? 'My Posts' : 'Posts',
    },
    {
      id: 'streaks',
      label: 'Streaks & Gamification',
    },
    ...(isOwnProfile
      ? [
          {
            id: 'saved',
            label: 'Bookmarks',
          },
        ]
      : []),
    {
      id: 'activity',
      label: 'Activity',
    },
  ];

  // Loading Skeleton State
  if (isLoadingProfile) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white border border-surface-200/90 p-6 sm:p-7 shadow-card animate-pulse space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-surface-200" />
              <div className="space-y-2">
                <div className="h-6 w-36 bg-surface-200 rounded-md" />
                <div className="h-4 w-28 bg-surface-200 rounded-full" />
                <div className="h-3 w-44 bg-surface-200 rounded-md" />
              </div>
            </div>
            <div className="h-9 w-28 bg-surface-200 rounded-xl" />
          </div>
          <div className="h-4 w-3/4 bg-surface-200 rounded-md" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-surface-100 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <PostSkeleton />
        </div>
      </div>
    );
  }

  // Error State
  if (profileError || !profile) {
    return (
      <EmptyState
        icon={<User className="w-8 h-8 text-surface-400" />}
        title="Student Profile Not Found"
        description={profileError || 'The requested student profile does not exist or may have been removed.'}
        actionLabel="Back to Home Feed"
        onAction={() => navigate('/')}
      />
    );
  }

  // Can the user restore streak right now?
  const isEligibleToRestore = isOwnProfile && !profile.isStreakAlive && (profile.streakRestoresRemaining > 0);

  return (
    <div className="space-y-6">
      {/* ── Main Clean Minimal Profile Header Card ─────────────────────────── */}
      <div className="rounded-2xl bg-white border border-surface-200/90 p-6 sm:p-7 shadow-card space-y-5">
        {/* Top Section: Avatar, Identity, Meta & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          {/* Avatar & Core Identity */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative group shrink-0">
              <Avatar
                name={profile.username}
                src={profile.profilePicture}
                size="2xl"
                className="ring-2 ring-brand-100/70 shadow-sm"
              />
              {isOwnProfile && (
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-brand-600 text-white shadow-md hover:bg-brand-700 transition-colors ring-2 ring-white"
                  title="Change profile picture"
                  aria-label="Change profile picture"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-surface-900 leading-tight tracking-tight">
                  @{profile.username}
                </h1>
                {profile.role === 'admin' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-purple-600" /> Admin
                  </span>
                )}
              </div>

              {/* Level & Role Pill */}
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200/60 inline-flex items-center gap-1">
                  Level {profile.level ?? 1} &bull; {profile.levelName ?? 'Contributor'}
                </span>
              </div>

              {/* Meta details: Join Date & Email */}
              <div className="flex items-center gap-3 text-xs text-surface-500 pt-0.5 flex-wrap">
                <span className="flex items-center gap-1.5 text-surface-500">
                  <Calendar className="w-3.5 h-3.5 text-surface-400" />
                  Joined {formatDate(profile.createdAt) || 'Recently'}
                </span>

                {isOwnProfile && profile.email && (
                  <span className="flex items-center gap-1.5 text-surface-500">
                    <Mail className="w-3.5 h-3.5 text-surface-400" />
                    {profile.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {isOwnProfile ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditModal(true)}
                  leftIcon={<Edit3 className="w-3.5 h-3.5 text-surface-500" />}
                  className="bg-white border-surface-200 hover:bg-surface-50 text-surface-700 px-3.5 py-2 rounded-xl text-xs font-medium shadow-subtle"
                >
                  Edit Profile
                </Button>
                <button
                  type="button"
                  onClick={handleShareProfile}
                  className="p-2 rounded-xl border border-surface-200 hover:bg-surface-50 text-surface-500 hover:text-surface-800 transition-colors shadow-subtle"
                  title="Share profile"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareProfile}
                leftIcon={<Share2 className="w-3.5 h-3.5 text-surface-500" />}
                className="bg-white border-surface-200 text-xs shadow-subtle"
              >
                Share Profile
              </Button>
            )}
          </div>
        </div>

        {/* Bio text */}
        <div className="text-xs sm:text-sm text-surface-700 leading-relaxed max-w-3xl">
          {profile.bio ? (
            <p className="break-words whitespace-pre-wrap">{profile.bio}</p>
          ) : isOwnProfile ? (
            <p className="text-surface-400 italic flex items-center gap-1.5">
              <span>No academic bio added yet.</span>
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="text-brand-600 hover:underline font-semibold not-italic"
              >
                Add a bio
              </button>
            </p>
          ) : (
            <p className="text-surface-400 italic">No bio provided yet.</p>
          )}
        </div>

        {/* 4 Clean Minimal Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {/* 1. Academic Points */}
          <div className="p-3 sm:p-3.5 rounded-xl border border-surface-200/80 bg-white shadow-subtle flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
              <Star className="w-4 h-4 text-brand-600 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <span className="text-lg font-bold text-surface-900 leading-tight block">
                {profile.points ?? 0}
              </span>
              <span className="text-xs text-surface-500 font-medium whitespace-nowrap block">
                Academic Points
              </span>
            </div>
          </div>

          {/* 2. Current Streak */}
          <div className="p-3 sm:p-3.5 rounded-xl border border-surface-200/80 bg-white shadow-subtle flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
            <div className="min-w-0">
              <span className="text-lg font-bold text-surface-900 leading-tight block">
                {profile.currentStreak ?? 0}
              </span>
              <span className="text-xs text-surface-500 font-medium whitespace-nowrap block">
                Current Streak
              </span>
            </div>
          </div>

          {/* 3. Posts */}
          <div className="p-3 sm:p-3.5 rounded-xl border border-surface-200/80 bg-white shadow-subtle flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-blue-600 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <span className="text-lg font-bold text-surface-900 leading-tight block">
                {profile.postsCount ?? 0}
              </span>
              <span className="text-xs text-surface-500 font-medium whitespace-nowrap block">
                Posts
              </span>
            </div>
          </div>

          {/* 4. Replies */}
          <div className="p-3 sm:p-3.5 rounded-xl border border-surface-200/80 bg-white shadow-subtle flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4 text-emerald-600 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <span className="text-lg font-bold text-surface-900 leading-tight block">
                {profile.commentsCount ?? 0}
              </span>
              <span className="text-xs text-surface-500 font-medium whitespace-nowrap block">
                Replies
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ──────────────────────────────────────────────── */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="line"
      />

      {/* ── TAB 1: User's Published Posts ─────────────────────────────────── */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {/* Posts Feed Error Alert */}
          {postsError && (
            <Alert variant="error" title="Could not load posts">
              {postsError}
            </Alert>
          )}

          {isLoadingPosts ? (
            <div className="space-y-4">
              <PostSkeleton />
              <PostSkeleton />
            </div>
          ) : posts.length === 0 ? (
            /* Clean Minimal Empty State Card matching the mockup */
            <div className="rounded-2xl bg-white border border-surface-200/90 p-12 text-center shadow-card flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-surface-100 flex items-center justify-center text-surface-400 mb-3.5">
                <FileText className="w-6 h-6 stroke-[1.8]" />
              </div>
              <h3 className="text-base font-bold text-surface-900">
                {isOwnProfile ? 'No posts yet' : `@${profile.username} has no posts yet`}
              </h3>
              <p className="text-xs text-surface-500 max-w-sm mt-1">
                {isOwnProfile
                  ? 'Share your first study note, question, or resource with the community.'
                  : 'Check back later to see notes and discussion questions shared by this student.'}
              </p>
              {isOwnProfile && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate('/create')}
                  className="mt-4 px-6 font-semibold"
                >
                  Create Post
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Sort & View Mode Controls Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-surface-200/80 shadow-xs">
                <span className="text-xs font-semibold text-surface-700">
                  {postsPagination.total} {postsPagination.total === 1 ? 'Study Post' : 'Study Posts'}
                </span>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-surface-400 hidden sm:inline">Sort:</span>
                    {['newest', 'trending', 'oldest'].map((sortKey) => (
                      <button
                        key={sortKey}
                        type="button"
                        onClick={() => setPostsSort(sortKey)}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-colors capitalize ${
                          postsSort === sortKey
                            ? 'bg-brand-50 text-brand-700 font-bold'
                            : 'text-surface-600 hover:bg-surface-100'
                        }`}
                      >
                        {sortKey}
                      </button>
                    ))}
                  </div>

                  {/* View layout toggle: List vs Grid */}
                  <div className="flex items-center gap-1 border-l border-surface-200 pl-2">
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-lg transition-colors ${
                        viewMode === 'list'
                          ? 'bg-brand-100 text-brand-700'
                          : 'text-surface-400 hover:text-surface-700 hover:bg-surface-100'
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
                          ? 'bg-brand-100 text-brand-700'
                          : 'text-surface-400 hover:text-surface-700 hover:bg-surface-100'
                      }`}
                      title="Grid View"
                      aria-label="Grid View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

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
                {postsPagination.hasMore && (
                  <div className="pt-4 text-center">
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => fetchUserPosts(profile.username, postsPagination.page + 1, true, postsSort)}
                      isLoading={isLoadingMorePosts}
                      disabled={isLoadingMorePosts}
                      className="w-full sm:w-auto min-w-[200px] bg-white shadow-xs"
                    >
                      {isLoadingMorePosts ? 'Loading More Posts...' : 'Load More Posts'}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB 2: Streaks & Gamification Breakdown ───────────────────────── */}
      {activeTab === 'streaks' && (
        <div className="space-y-5">
          {/* Gamification Progress & Streak Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <PointsProgressCard
              points={profile.points ?? 0}
              level={profile.level ?? 1}
              levelName={profile.levelName ?? 'Beginner'}
              nextLevel={profile.nextLevel}
              nextLevelName={profile.nextLevelName}
              pointsToNextLevel={profile.pointsToNextLevel}
            />

            <StreakCard
              currentStreak={profile.currentStreak ?? 0}
              longestStreak={profile.longestStreak ?? 0}
              postedToday={Boolean(profile.postedToday)}
              isStreakAlive={Boolean(profile.isStreakAlive)}
              streakRestoresRemaining={profile.streakRestoresRemaining ?? 0}
              isOwnProfile={isOwnProfile}
              onStreakRestored={handleStreakRestored}
              onOpenRestoreModal={() => setShowRestoreModal(true)}
            />
          </div>
          {/* Detailed Streak Mechanics Card */}
          <Card className="p-6 border border-surface-200/90 shadow-card space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-surface-100">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500">
                <Flame className="w-5 h-5 fill-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-surface-900">StudySync Daily Streak System</h3>
                <p className="text-xs text-surface-500">How daily posting streaks and calendar boundaries operate</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-xl bg-surface-50 border border-surface-200/70 space-y-1">
                <span className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">
                  Calendar Day Rule
                </span>
                <p className="text-xs text-surface-700 leading-relaxed">
                  A day resets at <strong>00:00 UTC</strong>. Posting at least once on consecutive days increases your streak.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-50 border border-surface-200/70 space-y-1">
                <span className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">
                  Multiple Posts
                </span>
                <p className="text-xs text-surface-700 leading-relaxed">
                  Posting multiple times in a single calendar day counts as <strong>one active streak day</strong> to prevent spam.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-50 border border-surface-200/70 space-y-1">
                <span className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">
                  Monthly Restores
                </span>
                <p className="text-xs text-surface-700 leading-relaxed">
                  Each student gets <strong>2 restore tokens per month</strong>. Restores can revive a broken streak after missing a day.
                </p>
              </div>
            </div>

            {/* Streak Status Summary */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-amber-950">
                  Current Streak: {profile.currentStreak ?? 0} {profile.currentStreak === 1 ? 'Day' : 'Days'} (Best Record: {profile.longestStreak ?? 0} Days)
                </h4>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  {profile.postedToday
                    ? "You've successfully completed today's posting goal!"
                    : profile.isStreakAlive
                    ? 'Your streak is active. Publish any post before midnight UTC to keep it going.'
                    : 'Your streak was broken because no post was created yesterday.'}
                </p>
              </div>

              {isOwnProfile && isEligibleToRestore && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowRestoreModal(true)}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  className="bg-amber-600 hover:bg-amber-700 shadow-amber-600/20 shrink-0 text-xs"
                >
                  Restore Broken Streak
                </Button>
              )}
            </div>
          </Card>

          {/* Gamification Levels Roadmap Card */}
          <Card className="p-6 border border-surface-200/90 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-surface-900">Gamification Levels & Milestones</h3>
                  <p className="text-xs text-surface-500">Progress through 5 academic tiers by contributing study materials</p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMilestonesModal(true)}
                className="bg-white text-xs"
              >
                View Full Ladder
              </Button>
            </div>

            {/* Quick Level Ladder Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-1">
              {[
                { lvl: 1, name: 'Beginner', pts: '0 pts' },
                { lvl: 2, name: 'Learner', pts: '10 pts' },
                { lvl: 3, name: 'Contributor', pts: '50 pts' },
                { lvl: 4, name: 'Knowledge Sharer', pts: '150 pts' },
                { lvl: 5, name: 'Scholar', pts: '400 pts' },
              ].map((tier) => {
                const isCurrent = profile.level === tier.lvl;
                const isCompleted = (profile.points || 0) >= parseInt(tier.pts);

                return (
                  <div
                    key={tier.lvl}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      isCurrent
                        ? 'bg-brand-50 border-brand-300 ring-2 ring-brand-500/20'
                        : isCompleted
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-surface-50 border-surface-200 opacity-60'
                    }`}
                  >
                    <div className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">
                      Level {tier.lvl}
                    </div>
                    <div className="text-xs font-bold text-surface-900 mt-0.5 truncate">
                      {tier.name}
                    </div>
                    <div className="text-[11px] text-surface-500 mt-0.5">
                      {tier.pts}
                    </div>
                    {isCurrent && (
                      <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand-600 text-white">
                        Current
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 3: Saved Bookmarks (Owner Only) ──────────────────────────── */}
      {activeTab === 'saved' && isOwnProfile && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-surface-200/80 shadow-xs">
            <span className="text-xs font-semibold text-surface-700">
              {bookmarksPagination.total} {bookmarksPagination.total === 1 ? 'Saved Bookmark' : 'Saved Bookmarks'}
            </span>

            <div className="flex items-center gap-2">
              {/* View layout toggle: List vs Grid */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-brand-100 text-brand-700'
                      : 'text-surface-400 hover:text-surface-700 hover:bg-surface-100'
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
                      ? 'bg-brand-100 text-brand-700'
                      : 'text-surface-400 hover:text-surface-700 hover:bg-surface-100'
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
                onClick={() => fetchOwnerBookmarks(1, false)}
                disabled={isLoadingBookmarks}
                className="h-8 px-2.5 text-xs text-surface-600 hover:text-surface-900"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBookmarks ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>

          {bookmarksError && (
            <Alert variant="error" title="Could not load bookmarks">
              {bookmarksError}
            </Alert>
          )}

          {isLoadingBookmarks ? (
            <div className="space-y-4">
              <PostSkeleton />
              <PostSkeleton />
            </div>
          ) : bookmarks.length === 0 ? (
            <EmptyState
              icon={<Bookmark className="w-8 h-8 text-brand-600" />}
              title="No bookmarks saved yet"
              description="Tap the bookmark icon on any helpful study post in the feed to save it here for fast revision."
              actionLabel="Explore Feed"
              onAction={() => navigate('/')}
            />
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
              {bookmarks.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onUpdate={handleBookmarkUpdate}
                  onDelete={handleBookmarkDelete}
                />
              ))}

              {/* Load More Bookmarks Button */}
              {bookmarksPagination.hasMore && (
                <div className="pt-4 text-center">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => fetchOwnerBookmarks(bookmarksPagination.page + 1, true)}
                    isLoading={isLoadingMoreBookmarks}
                    disabled={isLoadingMoreBookmarks}
                    className="w-full sm:w-auto min-w-[200px] bg-white shadow-xs"
                  >
                    {isLoadingMoreBookmarks ? 'Loading More Bookmarks...' : 'Load More Bookmarks'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* ── TAB 4: Student Activity Summary ───────────────────────────────── */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <Card className="p-6 border border-surface-200/90 shadow-card space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-surface-100">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-surface-900">Academic Contribution &amp; Activity</h3>
                <p className="text-xs text-surface-500">Summary of learning engagement and community participation</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-xl bg-surface-50 border border-surface-200/70">
                <span className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">
                  Study Notes Published
                </span>
                <span className="text-xl font-extrabold text-surface-900 mt-1 block">
                  {profile.postsCount ?? 0}
                </span>
                <p className="text-[11px] text-surface-500 mt-0.5">Peer resources &amp; guides</p>
              </div>

              <div className="p-4 rounded-xl bg-surface-50 border border-surface-200/70">
                <span className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">
                  Discussion Answers
                </span>
                <span className="text-xl font-extrabold text-surface-900 mt-1 block">
                  {profile.commentsCount ?? 0}
                </span>
                <p className="text-[11px] text-surface-500 mt-0.5">Helpful replies given</p>
              </div>

              <div className="p-4 rounded-xl bg-surface-50 border border-surface-200/70">
                <span className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">
                  Best Streak Record
                </span>
                <span className="text-xl font-extrabold text-amber-700 mt-1 block">
                  {profile.longestStreak ?? 0} Days
                </span>
                <p className="text-[11px] text-surface-500 mt-0.5">Consecutive study days</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-50/80 border border-surface-200/70 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-surface-800">StudySync Academic Honor Code Compliant</span>
              </div>
              <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                In Good Standing
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {isOwnProfile && (
        <>
          <EditProfileModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            profile={profile}
            onProfileUpdated={handleProfileUpdated}
          />

          <RestoreStreakModal
            isOpen={showRestoreModal}
            onClose={() => setShowRestoreModal(false)}
            streakInfo={{
              currentStreak: profile.currentStreak,
              longestStreak: profile.longestStreak,
              streakRestoresRemaining: profile.streakRestoresRemaining,
            }}
            onStreakRestored={handleStreakRestored}
          />
        </>
      )}

      <LevelMilestonesModal
        isOpen={showMilestonesModal}
        onClose={() => setShowMilestonesModal(false)}
        userPoints={profile.points ?? 0}
        currentLevel={profile.level ?? 1}
      />
    </div>
  );
}

export default ProfilePage;
