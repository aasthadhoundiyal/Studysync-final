import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Users,
  FileText,
  MessageSquare,
  Clock,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  Eye,
  Search,
  UserCheck,
  UserX,
  Filter,
  RefreshCw,
  History,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Tag,
  ArrowRight,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Tabs from '@/components/common/Tabs';
import Avatar from '@/components/common/Avatar';
import Textarea from '@/components/common/Textarea';
import Modal from '@/components/common/Modal';
import Alert from '@/components/common/Alert';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/utils/formatters';
import {
  getAdminStats,
  getPendingPosts,
  getRemovedPosts,
  getPendingComments,
  getRemovedComments,
  getModerationHistory,
  approvePost,
  removePost,
  restorePost,
  removeComment,
  restoreComment,
  getAdminUsers,
  suspendUser,
  reactivateUser,
  getPendingAppeals,
  getAllAppeals,
  approveAppeal,
  rejectAppeal,
} from '@/api/admin';

export function AdminDashboardPage() {
  const { user: currentAdmin, isAdmin } = useAuth();

  // Statistics state
  const [stats, setStats] = useState({
    users: { total: 0, suspended: 0 },
    posts: { total: 0, pending: 0, removed: 0 },
    comments: { total: 0, pending: 0, removed: 0 },
  });
  const [pendingAppealsCount, setPendingAppealsCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  // Active navigation tabs
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingSubTab, setPendingSubTab] = useState('posts'); // 'posts' | 'comments'
  const [removedSubTab, setRemovedSubTab] = useState('posts'); // 'posts' | 'comments'
  const [appealsFilter, setAppealsFilter] = useState(''); // '' | 'pending' | 'approved' | 'rejected'
  const [historyFilter, setHistoryFilter] = useState(''); // '' | 'post' | 'comment'
  const [userSearch, setUserSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  // Queue data & pagination states
  const [pendingPostsData, setPendingPostsData] = useState({ items: [], pagination: { page: 1, total: 0, totalPages: 1 } });
  const [pendingCommentsData, setPendingCommentsData] = useState({ items: [], pagination: { page: 1, total: 0, totalPages: 1 } });
  const [removedPostsData, setRemovedPostsData] = useState({ items: [], pagination: { page: 1, total: 0, totalPages: 1 } });
  const [removedCommentsData, setRemovedCommentsData] = useState({ items: [], pagination: { page: 1, total: 0, totalPages: 1 } });
  const [appealsData, setAppealsData] = useState({ items: [], pagination: { page: 1, total: 0, totalPages: 1 } });
  const [usersData, setUsersData] = useState({ items: [], pagination: { page: 1, total: 0, totalPages: 1 } });
  const [historyData, setHistoryData] = useState({ items: [], pagination: { page: 1, total: 0, totalPages: 1 } });

  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'danger', message: '' }

  // Action / Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    actionType: '', // approve_post, remove_post, restore_post, remove_comment, restore_comment, suspend_user, reactivate_user, approve_appeal, reject_appeal
    item: null,
    reason: '',
    adminNote: '',
    isExecuting: false,
  });

  // Inspection modal state
  const [inspectModal, setInspectModal] = useState({
    isOpen: false,
    type: '', // post, comment, appeal, user
    item: null,
  });

  // Load Dashboard Statistics
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const [statsRes, appealsRes] = await Promise.allSettled([
        getAdminStats(),
        getPendingAppeals({ limit: 1 }),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.stats) {
        setStats(statsRes.value.stats);
      }
      if (appealsRes.status === 'fulfilled' && appealsRes.value?.pagination) {
        setPendingAppealsCount(appealsRes.value.pagination.total || 0);
      }
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadStats();
    }
  }, [isAdmin, loadStats]);

  // Load Tab Content Data
  const loadTabData = useCallback(async (page = 1) => {
    if (!isAdmin) return;
    setIsLoadingQueue(true);

    try {
      if (activeTab === 'pending') {
        if (pendingSubTab === 'posts') {
          const res = await getPendingPosts({ page, limit: 10 });
          if (res?.success) {
            setPendingPostsData({
              items: res.posts || [],
              pagination: res.pagination || { page: 1, total: 0, totalPages: 1 },
            });
          }
        } else {
          const res = await getPendingComments({ page, limit: 10 });
          if (res?.success) {
            setPendingCommentsData({
              items: res.comments || [],
              pagination: res.pagination || { page: 1, total: 0, totalPages: 1 },
            });
          }
        }
      } else if (activeTab === 'removed') {
        if (removedSubTab === 'posts') {
          const res = await getRemovedPosts({ page, limit: 10 });
          if (res?.success) {
            setRemovedPostsData({
              items: res.posts || [],
              pagination: res.pagination || { page: 1, total: 0, totalPages: 1 },
            });
          }
        } else {
          const res = await getRemovedComments({ page, limit: 10 });
          if (res?.success) {
            setRemovedCommentsData({
              items: res.comments || [],
              pagination: res.pagination || { page: 1, total: 0, totalPages: 1 },
            });
          }
        }
      } else if (activeTab === 'appeals') {
        const res = await getAllAppeals({
          page,
          limit: 10,
          status: appealsFilter || undefined,
        });
        if (res?.success) {
          setAppealsData({
            items: res.appeals || [],
            pagination: res.pagination || { page: 1, total: 0, totalPages: 1 },
          });
        }
      } else if (activeTab === 'users') {
        const res = await getAdminUsers({
          page,
          limit: 10,
          search: activeSearch || undefined,
        });
        if (res?.success) {
          setUsersData({
            items: res.users || [],
            pagination: res.pagination || { page: 1, total: 0, totalPages: 1 },
          });
        }
      } else if (activeTab === 'history') {
        const res = await getModerationHistory({
          page,
          limit: 15,
          contentType: historyFilter || undefined,
        });
        if (res?.success) {
          setHistoryData({
            items: res.history || [],
            pagination: res.pagination || { page: 1, total: 0, totalPages: 1 },
          });
        }
      }
    } catch (err) {
      console.error('Failed to load queue data:', err);
      setFeedback({
        type: 'danger',
        message: err?.response?.data?.message || err?.message || 'Failed to fetch queue data.',
      });
    } finally {
      setIsLoadingQueue(false);
    }
  }, [
    isAdmin,
    activeTab,
    pendingSubTab,
    removedSubTab,
    appealsFilter,
    activeSearch,
    historyFilter,
  ]);

  // Refetch when tab or subfilter changes
  useEffect(() => {
    loadTabData(1);
  }, [loadTabData]);

  // Handle Search submit for Users
  const handleUserSearchSubmit = (e) => {
    e.preventDefault();
    setActiveSearch(userSearch.trim());
  };

  const handleClearUserSearch = () => {
    setUserSearch('');
    setActiveSearch('');
  };

  // Open confirmation modal
  const openConfirmModal = (actionType, item) => {
    setConfirmModal({
      isOpen: true,
      actionType,
      item,
      reason: '',
      adminNote: '',
      isExecuting: false,
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal({
      isOpen: false,
      actionType: '',
      item: null,
      reason: '',
      adminNote: '',
      isExecuting: false,
    });
  };

  // Execute moderation or governance action
  const handleConfirmAction = async () => {
    const { actionType, item, reason, adminNote } = confirmModal;
    if (!item) return;

    setConfirmModal((prev) => ({ ...prev, isExecuting: true }));
    setFeedback(null);

    try {
      let successMsg = '';

      switch (actionType) {
        case 'approve_post':
          await approvePost(item._id, reason.trim());
          successMsg = `Post "${item.title || item._id}" approved and published successfully.`;
          break;
        case 'remove_post':
          await removePost(item._id, reason.trim());
          successMsg = `Post "${item.title || item._id}" removed from public feed.`;
          break;
        case 'restore_post':
          await restorePost(item._id, reason.trim());
          successMsg = `Post "${item.title || item._id}" restored to published status.`;
          break;
        case 'remove_comment':
          await removeComment(item._id, reason.trim());
          successMsg = 'Comment removed successfully.';
          break;
        case 'restore_comment':
          await restoreComment(item._id, reason.trim());
          successMsg = 'Comment restored to published status.';
          break;
        case 'suspend_user':
          await suspendUser(item._id);
          successMsg = `User @${item.username} suspended.`;
          break;
        case 'reactivate_user':
          await reactivateUser(item._id);
          successMsg = `User @${item.username} reactivated.`;
          break;
        case 'approve_appeal':
          await approveAppeal(item._id, adminNote.trim());
          successMsg = 'Appeal approved and original content automatically restored.';
          break;
        case 'reject_appeal':
          await rejectAppeal(item._id, adminNote.trim());
          successMsg = 'Appeal rejected. Content remains removed.';
          break;
        default:
          throw new Error('Unknown action');
      }

      setFeedback({ type: 'success', message: successMsg });
      closeConfirmModal();
      // Reload stats and active tab data
      loadStats();
      loadTabData(1);
    } catch (err) {
      console.error('Admin action failed:', err);
      setFeedback({
        type: 'danger',
        message: err?.response?.data?.message || err?.message || 'Action failed. Please try again.',
      });
      setConfirmModal((prev) => ({ ...prev, isExecuting: false }));
    }
  };

  // Total pending reviews count
  const totalPendingReviews =
    (stats.posts?.pending || 0) + (stats.comments?.pending || 0);

  // Total removed content count
  const totalRemovedContent =
    (stats.posts?.removed || 0) + (stats.comments?.removed || 0);

  // Tabs configuration
  const tabs = [
    {
      id: 'pending',
      label: 'Pending Reviews',
      icon: <Clock className="w-4 h-4" />,
      count: totalPendingReviews > 0 ? totalPendingReviews : undefined,
    },
    {
      id: 'removed',
      label: 'Removed Content',
      icon: <AlertTriangle className="w-4 h-4" />,
      count: totalRemovedContent > 0 ? totalRemovedContent : undefined,
    },
    {
      id: 'appeals',
      label: 'Appeals',
      icon: <ShieldCheck className="w-4 h-4" />,
      count: pendingAppealsCount > 0 ? pendingAppealsCount : undefined,
    },
    {
      id: 'users',
      label: 'User Management',
      icon: <Users className="w-4 h-4" />,
      count: stats.users?.total || undefined,
    },
    {
      id: 'history',
      label: 'Moderation History',
      icon: <History className="w-4 h-4" />,
    },
  ];

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-2xl bg-white border border-surface-200 text-center shadow-card space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200/60 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-surface-900">Access Denied</h2>
          <p className="text-xs text-surface-500 mt-1.5 leading-relaxed">
            You do not have administrative privileges to access this area. This section is restricted to StudySync platform administrators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Moderation Hub Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-brand-600" />
            Admin Moderation & Governance Hub
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Review AI moderation flags, oversee community content, manage appeals, and administer student accounts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              loadStats();
              loadTabData(1);
            }}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Badge variant="brand" size="md">
            Admin: @{currentAdmin?.username}
          </Badge>
        </div>
      </div>

      {/* Global Feedback Alert */}
      {feedback && (
        <Alert
          variant={feedback.type}
          title={feedback.type === 'success' ? 'Action Completed' : 'Operation Failed'}
          onClose={() => setFeedback(null)}
        >
          {feedback.message}
        </Alert>
      )}

      {/* 5 Real Metric Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <Card className="p-4 bg-white border border-surface-200/90 shadow-subtle">
          <div className="flex items-center justify-between text-surface-500 text-xs mb-1">
            <span>Total Students</span>
            <Users className="w-4 h-4 text-surface-400" />
          </div>
          <div className="text-2xl font-bold text-surface-900">
            {statsLoading ? '...' : stats.users?.total ?? 0}
          </div>
          <span className="text-[10px] text-surface-400 font-medium">
            {stats.users?.suspended ?? 0} suspended
          </span>
        </Card>

        <Card className="p-4 bg-white border border-surface-200/90 shadow-subtle">
          <div className="flex items-center justify-between text-surface-500 text-xs mb-1">
            <span>Study Posts</span>
            <FileText className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-bold text-surface-900">
            {statsLoading ? '...' : stats.posts?.total ?? 0}
          </div>
          <span className="text-[10px] text-surface-400 font-medium">
            {stats.posts?.removed ?? 0} removed
          </span>
        </Card>

        <Card className="p-4 bg-white border border-surface-200/90 shadow-subtle">
          <div className="flex items-center justify-between text-surface-500 text-xs mb-1">
            <span>Comments</span>
            <MessageSquare className="w-4 h-4 text-brand-500" />
          </div>
          <div className="text-2xl font-bold text-surface-900">
            {statsLoading ? '...' : stats.comments?.total ?? 0}
          </div>
          <span className="text-[10px] text-surface-400 font-medium">
            {stats.comments?.removed ?? 0} removed
          </span>
        </Card>

        <Card className="p-4 bg-amber-50/60 border border-amber-200 shadow-subtle">
          <div className="flex items-center justify-between text-amber-700 text-xs mb-1">
            <span>Pending Reviews</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-900">
            {statsLoading ? '...' : totalPendingReviews}
          </div>
          <span className="text-[10px] text-amber-700 font-medium">
            {stats.posts?.pending || 0} posts, {stats.comments?.pending || 0} comments
          </span>
        </Card>

        <Card className="p-4 bg-indigo-50/60 border border-indigo-200 shadow-subtle col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-indigo-700 text-xs mb-1">
            <span>Pending Appeals</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-900">
            {statsLoading ? '...' : pendingAppealsCount}
          </div>
          <span className="text-[10px] text-indigo-700 font-medium">
            Requires admin decision
          </span>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId)}
        variant="pills"
        className="w-full sm:w-auto"
      />

      {/* TAB 1: PENDING REVIEWS */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {/* Sub-segmented control: Posts vs Comments */}
          <div className="flex items-center justify-between border-b border-surface-200 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPendingSubTab('posts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  pendingSubTab === 'posts'
                    ? 'bg-brand-50 text-brand-700 border border-brand-200'
                    : 'text-surface-600 hover:bg-surface-100'
                }`}
              >
                Pending Posts ({stats.posts?.pending || 0})
              </button>
              <button
                type="button"
                onClick={() => setPendingSubTab('comments')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  pendingSubTab === 'comments'
                    ? 'bg-brand-50 text-brand-700 border border-brand-200'
                    : 'text-surface-600 hover:bg-surface-100'
                }`}
              >
                Pending Comments ({stats.comments?.pending || 0})
              </button>
            </div>

            <span className="text-xs text-surface-400">
              {pendingSubTab === 'posts' ? pendingPostsData.pagination.total : pendingCommentsData.pagination.total} items
            </span>
          </div>

          {isLoadingQueue ? (
            <div className="p-12 flex flex-col items-center justify-center gap-2">
              <Spinner size="lg" />
              <span className="text-xs text-surface-400">Loading pending moderation queue...</span>
            </div>
          ) : pendingSubTab === 'posts' ? (
            pendingPostsData.items.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-8 h-8 text-emerald-500" />}
                title="No Posts Awaiting Review"
                description="The pending posts queue is completely clear. All submitted posts have been verified or published."
              />
            ) : (
              <div className="space-y-3">
                {pendingPostsData.items.map((post) => (
                  <Card key={post._id} className="p-5 border-l-4 border-l-amber-500 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="warning" size="sm" dot>
                            Pending Review
                          </Badge>
                          <span className="text-xs font-semibold text-surface-800">
                            @{post.author?.username || 'unknown'}
                          </span>
                          {post.author?.email && (
                            <span className="text-[11px] text-surface-400">
                              ({post.author.email})
                            </span>
                          )}
                          <span className="text-surface-300">&bull;</span>
                          <span className="text-[11px] text-surface-400">
                            {formatDate(post.createdAt)}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-surface-900 leading-snug">
                          {post.title}
                        </h3>

                        <p className="text-xs text-surface-600 line-clamp-3 bg-surface-50 p-2.5 rounded-lg border border-surface-100">
                          {post.content}
                        </p>

                        {Array.isArray(post.tags) && post.tags.length > 0 && (
                          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                            {post.tags.map((t) => (
                              <span
                                key={t}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-surface-100 text-surface-600 font-medium"
                              >
                                <Tag className="w-2.5 h-2.5" />
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInspectModal({ isOpen: true, type: 'post', item: post })}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          Inspect
                        </Button>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => openConfirmModal('approve_post', post)}
                          leftIcon={<Check className="w-3.5 h-3.5" />}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => openConfirmModal('remove_post', post)}
                          leftIcon={<X className="w-3.5 h-3.5" />}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}

                {/* Pagination Controls */}
                {pendingPostsData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pendingPostsData.pagination.page <= 1}
                      onClick={() => loadTabData(pendingPostsData.pagination.page - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-surface-500">
                      Page {pendingPostsData.pagination.page} of {pendingPostsData.pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pendingPostsData.pagination.page >= pendingPostsData.pagination.totalPages}
                      onClick={() => loadTabData(pendingPostsData.pagination.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )
          ) : (
            pendingCommentsData.items.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-8 h-8 text-emerald-500" />}
                title="No Comments Awaiting Review"
                description="The pending comments queue is completely clear. All user comments meet moderation standards."
              />
            ) : (
              <div className="space-y-3">
                {pendingCommentsData.items.map((comment) => (
                  <Card key={comment._id} className="p-4 border-l-4 border-l-amber-500 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="warning" size="sm" dot>
                            Pending Comment
                          </Badge>
                          <span className="text-xs font-semibold text-surface-800">
                            @{comment.author?.username || 'unknown'}
                          </span>
                          <span className="text-surface-300">&bull;</span>
                          <span className="text-[11px] text-surface-400">
                            {formatDate(comment.createdAt)}
                          </span>
                          {comment.post && (
                            <span className="text-[10px] text-surface-400 font-mono bg-surface-100 px-1.5 py-0.5 rounded">
                              Post: {comment.post}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-surface-700 bg-surface-50 p-2.5 rounded-lg border border-surface-100">
                          {comment.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInspectModal({ isOpen: true, type: 'comment', item: comment })}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          Inspect
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => openConfirmModal('remove_comment', comment)}
                          leftIcon={<X className="w-3.5 h-3.5" />}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}

                {pendingCommentsData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pendingCommentsData.pagination.page <= 1}
                      onClick={() => loadTabData(pendingCommentsData.pagination.page - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-surface-500">
                      Page {pendingCommentsData.pagination.page} of {pendingCommentsData.pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pendingCommentsData.pagination.page >= pendingCommentsData.pagination.totalPages}
                      onClick={() => loadTabData(pendingCommentsData.pagination.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* TAB 2: REMOVED CONTENT */}
      {activeTab === 'removed' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-surface-200 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRemovedSubTab('posts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  removedSubTab === 'posts'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'text-surface-600 hover:bg-surface-100'
                }`}
              >
                Removed Posts ({stats.posts?.removed || 0})
              </button>
              <button
                type="button"
                onClick={() => setRemovedSubTab('comments')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  removedSubTab === 'comments'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'text-surface-600 hover:bg-surface-100'
                }`}
              >
                Removed Comments ({stats.comments?.removed || 0})
              </button>
            </div>

            <span className="text-xs text-surface-400">
              {removedSubTab === 'posts' ? removedPostsData.pagination.total : removedCommentsData.pagination.total} items
            </span>
          </div>

          {isLoadingQueue ? (
            <div className="p-12 flex flex-col items-center justify-center gap-2">
              <Spinner size="lg" />
              <span className="text-xs text-surface-400">Loading removed content queue...</span>
            </div>
          ) : removedSubTab === 'posts' ? (
            removedPostsData.items.length === 0 ? (
              <EmptyState
                icon={<FileText className="w-8 h-8 text-surface-400" />}
                title="No Removed Posts"
                description="There are currently no removed study posts in the system."
              />
            ) : (
              <div className="space-y-3">
                {removedPostsData.items.map((post) => (
                  <Card key={post._id} className="p-4 border-l-4 border-l-rose-500 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="danger" size="sm" dot>
                            Removed
                          </Badge>
                          <span className="text-xs font-semibold text-surface-800">
                            @{post.author?.username || 'unknown'}
                          </span>
                          <span className="text-surface-300">&bull;</span>
                          <span className="text-[11px] text-surface-400">
                            {formatDate(post.createdAt)}
                          </span>
                        </div>

                        <h3 className="text-sm font-semibold text-surface-900 line-through text-surface-500">
                          {post.title}
                        </h3>

                        <p className="text-xs text-surface-500 line-clamp-2 bg-surface-50 p-2.5 rounded-lg border border-surface-100 font-mono text-[11px]">
                          {post.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInspectModal({ isOpen: true, type: 'post', item: post })}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          Inspect
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => openConfirmModal('restore_post', post)}
                          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                        >
                          Restore Post
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}

                {removedPostsData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={removedPostsData.pagination.page <= 1}
                      onClick={() => loadTabData(removedPostsData.pagination.page - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-surface-500">
                      Page {removedPostsData.pagination.page} of {removedPostsData.pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={removedPostsData.pagination.page >= removedPostsData.pagination.totalPages}
                      onClick={() => loadTabData(removedPostsData.pagination.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )
          ) : (
            removedCommentsData.items.length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="w-8 h-8 text-surface-400" />}
                title="No Removed Comments"
                description="There are currently no removed comments in the moderation database."
              />
            ) : (
              <div className="space-y-3">
                {removedCommentsData.items.map((comment) => (
                  <Card key={comment._id} className="p-4 border-l-4 border-l-rose-500 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="danger" size="sm" dot>
                            Removed Comment
                          </Badge>
                          <span className="text-xs font-semibold text-surface-800">
                            @{comment.author?.username || 'unknown'}
                          </span>
                          <span className="text-surface-300">&bull;</span>
                          <span className="text-[11px] text-surface-400">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>

                        <p className="text-xs text-surface-500 bg-surface-50 p-2.5 rounded-lg border border-surface-100 line-through">
                          {comment.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInspectModal({ isOpen: true, type: 'comment', item: comment })}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          Inspect
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => openConfirmModal('restore_comment', comment)}
                          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                        >
                          Restore Comment
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}

                {removedCommentsData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={removedCommentsData.pagination.page <= 1}
                      onClick={() => loadTabData(removedCommentsData.pagination.page - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-surface-500">
                      Page {removedCommentsData.pagination.page} of {removedCommentsData.pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={removedCommentsData.pagination.page >= removedCommentsData.pagination.totalPages}
                      onClick={() => loadTabData(removedCommentsData.pagination.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* TAB 3: APPEALS QUEUE */}
      {activeTab === 'appeals' && (
        <div className="space-y-4">
          {/* Status filter bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-200 pb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-surface-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter Status:
              </span>
              {[
                { id: '', label: 'All Appeals' },
                { id: 'pending', label: 'Pending Only' },
                { id: 'approved', label: 'Approved' },
                { id: 'rejected', label: 'Rejected' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setAppealsFilter(f.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    appealsFilter === f.id
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <span className="text-xs text-surface-400">
              {appealsData.pagination.total} records found
            </span>
          </div>

          {isLoadingQueue ? (
            <div className="p-12 flex flex-col items-center justify-center gap-2">
              <Spinner size="lg" />
              <span className="text-xs text-surface-400">Loading appeal requests...</span>
            </div>
          ) : appealsData.items.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="w-8 h-8 text-surface-400" />}
              title="No Appeals Found"
              description="There are no user appeals matching the selected filter criteria."
            />
          ) : (
            <div className="space-y-3">
              {appealsData.items.map((app) => (
                <Card
                  key={app._id}
                  className={`p-5 border-l-4 space-y-3 ${
                    app.status === 'pending'
                      ? 'border-l-amber-500'
                      : app.status === 'approved'
                      ? 'border-l-emerald-500'
                      : 'border-l-rose-500'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {app.status === 'pending' ? (
                          <Badge variant="warning" size="sm" dot>
                            Pending Review
                          </Badge>
                        ) : app.status === 'approved' ? (
                          <Badge variant="success" size="sm" dot>
                            Approved & Restored
                          </Badge>
                        ) : (
                          <Badge variant="danger" size="sm" dot>
                            Rejected
                          </Badge>
                        )}

                        <span className="text-xs font-semibold text-surface-800">
                          @{app.appellant?.username || 'appellant'}
                        </span>
                        {app.appellant?.email && (
                          <span className="text-[11px] text-surface-400">
                            ({app.appellant.email})
                          </span>
                        )}

                        <span className="text-surface-300">&bull;</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-surface-100 text-surface-600">
                          {app.contentType}
                        </span>
                        <span className="text-[11px] font-mono text-surface-500">
                          ID: {app.contentId}
                        </span>
                        <span className="text-surface-300">&bull;</span>
                        <span className="text-[11px] text-surface-400">
                          {formatDate(app.createdAt)}
                        </span>
                      </div>

                      {/* User's appeal reason */}
                      <div className="text-xs text-surface-700 bg-surface-50 p-3 rounded-xl border border-surface-100">
                        <span className="font-semibold text-surface-800 block mb-0.5">
                          User's Explanation:
                        </span>
                        {app.reason}
                      </div>

                      {/* Admin Note if resolved */}
                      {app.adminNote && (
                        <div className="text-xs text-brand-900 bg-brand-50/70 p-2.5 rounded-lg border border-brand-200/60">
                          <span className="font-semibold text-brand-800">
                            Admin Note:
                          </span>{' '}
                          {app.adminNote}
                        </div>
                      )}
                    </div>

                    {/* Actions if still pending */}
                    <div className="flex items-center gap-2 shrink-0 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setInspectModal({ isOpen: true, type: 'appeal', item: app })}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Inspect
                      </Button>

                      {app.status === 'pending' && (
                        <>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => openConfirmModal('approve_appeal', app)}
                            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          >
                            Approve & Restore
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => openConfirmModal('reject_appeal', app)}
                            leftIcon={<XCircle className="w-3.5 h-3.5" />}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}

              {appealsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={appealsData.pagination.page <= 1}
                    onClick={() => loadTabData(appealsData.pagination.page - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-surface-500">
                    Page {appealsData.pagination.page} of {appealsData.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={appealsData.pagination.page >= appealsData.pagination.totalPages}
                    onClick={() => loadTabData(appealsData.pagination.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* User Search Bar */}
          <form
            onSubmit={handleUserSearchSubmit}
            className="flex items-center gap-2 max-w-md"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search user by username or email..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-surface-200 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
              {userSearch && (
                <button
                  type="button"
                  onClick={handleClearUserSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Button type="submit" variant="primary" size="sm">
              Search
            </Button>
          </form>

          {isLoadingQueue ? (
            <div className="p-12 flex flex-col items-center justify-center gap-2">
              <Spinner size="lg" />
              <span className="text-xs text-surface-400">Loading user governance directory...</span>
            </div>
          ) : usersData.items.length === 0 ? (
            <EmptyState
              icon={<Users className="w-8 h-8 text-surface-400" />}
              title="No Users Found"
              description={activeSearch ? `No users matching "${activeSearch}".` : 'No users currently registered.'}
            />
          ) : (
            <div className="space-y-3">
              {usersData.items.map((u) => {
                const isSelf = String(u._id) === String(currentAdmin?._id);
                const isOtherAdmin = u.role === 'admin';

                return (
                  <Card key={u._id} className="p-4 hover:border-surface-300 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={u.username || 'Student'} size="md" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-surface-900 truncate">
                              @{u.username}
                            </span>
                            <Badge
                              variant={u.role === 'admin' ? 'brand' : 'default'}
                              size="sm"
                            >
                              {u.role === 'admin' ? 'Admin' : 'Student'}
                            </Badge>
                            {u.isSuspended ? (
                              <Badge variant="danger" size="sm" dot>
                                Suspended
                              </Badge>
                            ) : (
                              <Badge variant="success" size="sm" dot>
                                Active
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-surface-500 mt-0.5">
                            <span className="truncate">{u.email}</span>
                            <span>&bull;</span>
                            <span className="font-semibold text-brand-600">
                              {u.points || 0} pts
                            </span>
                            <span>&bull;</span>
                            <span>Joined {formatDate(u.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInspectModal({ isOpen: true, type: 'user', item: u })}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          Details
                        </Button>

                        {isSelf ? (
                          <Badge variant="brand" size="sm">
                            Your Account
                          </Badge>
                        ) : isOtherAdmin ? (
                          <span className="text-[11px] text-surface-400 italic px-2 py-1">
                            Protected Admin
                          </span>
                        ) : u.isSuspended ? (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => openConfirmModal('reactivate_user', u)}
                            leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                          >
                            Reactivate
                          </Button>
                        ) : (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => openConfirmModal('suspend_user', u)}
                            leftIcon={<UserX className="w-3.5 h-3.5" />}
                          >
                            Suspend
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}

              {usersData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={usersData.pagination.page <= 1}
                    onClick={() => loadTabData(usersData.pagination.page - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-surface-500">
                    Page {usersData.pagination.page} of {usersData.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={usersData.pagination.page >= usersData.pagination.totalPages}
                    onClick={() => loadTabData(usersData.pagination.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: MODERATION HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* History filter */}
          <div className="flex items-center justify-between border-b border-surface-200 pb-3">
            <div className="flex items-center gap-2">
              {[
                { id: '', label: 'All Actions' },
                { id: 'post', label: 'Posts Only' },
                { id: 'comment', label: 'Comments Only' },
              ].map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setHistoryFilter(h.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    historyFilter === h.id
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>

            <span className="text-xs text-surface-400">
              {historyData.pagination.total} audit logs
            </span>
          </div>

          {isLoadingQueue ? (
            <div className="p-12 flex flex-col items-center justify-center gap-2">
              <Spinner size="lg" />
              <span className="text-xs text-surface-400">Loading audit history...</span>
            </div>
          ) : historyData.items.length === 0 ? (
            <EmptyState
              icon={<History className="w-8 h-8 text-surface-400" />}
              title="No Moderation Records"
              description="No administrative moderation actions have been recorded yet."
            />
          ) : (
            <div className="space-y-2.5">
              {historyData.items.map((log) => (
                <Card key={log._id} className="p-3.5 text-xs hover:border-surface-300 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant={
                          log.action === 'approved'
                            ? 'success'
                            : log.action === 'removed'
                            ? 'danger'
                            : 'brand'
                        }
                        size="sm"
                      >
                        {log.action}
                      </Badge>

                      <span className="font-semibold text-surface-900">
                        @{typeof log.admin === 'object' ? log.admin?.username : 'admin'}
                      </span>

                      <span className="text-surface-400">moderated</span>

                      <span className="font-bold uppercase text-[10px] px-1.5 py-0.5 rounded bg-surface-100 text-surface-700">
                        {log.contentType}
                      </span>

                      <span className="font-mono text-[11px] text-surface-500">
                        {log.contentId}
                      </span>

                      {log.previousStatus && log.newStatus && (
                        <span className="text-surface-400 flex items-center gap-1 text-[11px]">
                          ({log.previousStatus} <ArrowRight className="w-3 h-3" /> {log.newStatus})
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-surface-400 shrink-0">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>

                  {log.reason && (
                    <div className="mt-2 text-surface-600 bg-surface-50 p-2 rounded border border-surface-100">
                      <span className="font-semibold text-surface-700">Note: </span>
                      {log.reason}
                    </div>
                  )}
                </Card>
              ))}

              {historyData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={historyData.pagination.page <= 1}
                    onClick={() => loadTabData(historyData.pagination.page - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-surface-500">
                    Page {historyData.pagination.page} of {historyData.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={historyData.pagination.page >= historyData.pagination.totalPages}
                    onClick={() => loadTabData(historyData.pagination.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={confirmModal.isExecuting ? undefined : closeConfirmModal}
        title={
          confirmModal.actionType === 'approve_post'
            ? 'Approve Study Post'
            : confirmModal.actionType === 'remove_post'
            ? 'Remove Study Post'
            : confirmModal.actionType === 'restore_post'
            ? 'Restore Study Post'
            : confirmModal.actionType === 'remove_comment'
            ? 'Remove Comment'
            : confirmModal.actionType === 'restore_comment'
            ? 'Restore Comment'
            : confirmModal.actionType === 'suspend_user'
            ? 'Suspend User Account'
            : confirmModal.actionType === 'reactivate_user'
            ? 'Reactivate User Account'
            : confirmModal.actionType === 'approve_appeal'
            ? 'Approve Content Appeal'
            : confirmModal.actionType === 'reject_appeal'
            ? 'Reject Content Appeal'
            : 'Confirm Action'
        }
        description={
          confirmModal.actionType === 'approve_post'
            ? 'Approving will publish this post to the public feed and notify the author.'
            : confirmModal.actionType === 'remove_post'
            ? 'Removing this post hides it from the community feed. You can optionally log a reason.'
            : confirmModal.actionType === 'restore_post'
            ? 'Restoring will republish this post back to the feed.'
            : confirmModal.actionType === 'remove_comment'
            ? 'Removing this comment will hide it from the discussion.'
            : confirmModal.actionType === 'restore_comment'
            ? 'Restoring will unhide this comment in the discussion.'
            : confirmModal.actionType === 'suspend_user'
            ? `Are you sure you want to suspend @${confirmModal.item?.username}? Suspended users cannot create posts or comments.`
            : confirmModal.actionType === 'reactivate_user'
            ? `Reactivating will restore account access and posting privileges for @${confirmModal.item?.username}.`
            : confirmModal.actionType === 'approve_appeal'
            ? 'Approving this appeal will automatically restore the original removed content and notify the user.'
            : confirmModal.actionType === 'reject_appeal'
            ? 'Rejecting this appeal will leave the content removed and notify the user of your decision.'
            : ''
        }
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              disabled={confirmModal.isExecuting}
              onClick={closeConfirmModal}
            >
              Cancel
            </Button>
            <Button
              variant={
                confirmModal.actionType.includes('remove') ||
                confirmModal.actionType.includes('suspend') ||
                confirmModal.actionType.includes('reject')
                  ? 'danger'
                  : 'primary'
              }
              size="sm"
              loading={confirmModal.isExecuting}
              onClick={handleConfirmAction}
            >
              {confirmModal.actionType.includes('approve')
                ? 'Confirm Approval'
                : confirmModal.actionType.includes('remove')
                ? 'Confirm Removal'
                : confirmModal.actionType.includes('restore')
                ? 'Confirm Restore'
                : confirmModal.actionType.includes('suspend')
                ? 'Suspend User'
                : confirmModal.actionType.includes('reactivate')
                ? 'Reactivate User'
                : confirmModal.actionType.includes('reject')
                ? 'Reject Appeal'
                : 'Confirm'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Reason or Admin Note Input for moderation actions */}
          {['approve_post', 'remove_post', 'restore_post', 'remove_comment', 'restore_comment'].includes(
            confirmModal.actionType
          ) && (
            <Textarea
              label="Moderation Reason / Log Note (optional)"
              value={confirmModal.reason}
              onChange={(e) =>
                setConfirmModal((prev) => ({ ...prev, reason: e.target.value }))
              }
              placeholder="e.g. Content adheres to academic policies, or violates honor code guidelines..."
              rows={3}
              maxLength={500}
              helperText={`${confirmModal.reason.length}/500 characters`}
            />
          )}

          {['approve_appeal', 'reject_appeal'].includes(confirmModal.actionType) && (
            <Textarea
              label="Admin Response Note to Appellant (optional)"
              value={confirmModal.adminNote}
              onChange={(e) =>
                setConfirmModal((prev) => ({ ...prev, adminNote: e.target.value }))
              }
              placeholder="Explain the reason for this decision. This note will be visible to the user."
              rows={3}
              maxLength={1000}
              helperText={`${confirmModal.adminNote.length}/1000 characters`}
            />
          )}

          {confirmModal.actionType === 'suspend_user' && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
              <strong>Warning:</strong> The user will lose session validity and will not be able to interact with the platform until reactivated.
            </div>
          )}
        </div>
      </Modal>

      {/* INSPECTION MODAL */}
      <Modal
        isOpen={inspectModal.isOpen}
        onClose={() => setInspectModal({ isOpen: false, type: '', item: null })}
        title={
          inspectModal.type === 'post'
            ? 'Inspect Post Details'
            : inspectModal.type === 'comment'
            ? 'Inspect Comment Details'
            : inspectModal.type === 'appeal'
            ? 'Inspect Appeal Details'
            : 'Inspect User Details'
        }
        maxWidth="max-w-xl"
        footer={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInspectModal({ isOpen: false, type: '', item: null })}
          >
            Close
          </Button>
        }
      >
        {inspectModal.item && (
          <div className="space-y-3 text-xs">
            {inspectModal.type === 'post' && (
              <>
                <div>
                  <span className="text-surface-400 font-medium">Post ID:</span>
                  <p className="font-mono text-surface-800 select-all">{inspectModal.item._id}</p>
                </div>
                <div>
                  <span className="text-surface-400 font-medium">Title:</span>
                  <p className="font-bold text-surface-900 text-sm mt-0.5">{inspectModal.item.title}</p>
                </div>
                <div>
                  <span className="text-surface-400 font-medium">Author:</span>
                  <p className="text-surface-800">
                    @{inspectModal.item.author?.username} ({inspectModal.item.author?.email})
                  </p>
                </div>
                <div>
                  <span className="text-surface-400 font-medium">Full Content:</span>
                  <div className="mt-1 p-3 rounded-xl bg-surface-50 border border-surface-200 text-surface-800 whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {inspectModal.item.content}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-surface-500 pt-1">
                  <span>Status: <strong>{inspectModal.item.status}</strong></span>
                  <span>Created: {formatDate(inspectModal.item.createdAt)}</span>
                </div>
              </>
            )}

            {inspectModal.type === 'comment' && (
              <>
                <div>
                  <span className="text-surface-400 font-medium">Comment ID:</span>
                  <p className="font-mono text-surface-800 select-all">{inspectModal.item._id}</p>
                </div>
                <div>
                  <span className="text-surface-400 font-medium">Post Reference:</span>
                  <p className="font-mono text-surface-800">{inspectModal.item.post}</p>
                </div>
                <div>
                  <span className="text-surface-400 font-medium">Author:</span>
                  <p className="text-surface-800">
                    @{inspectModal.item.author?.username} ({inspectModal.item.author?.email})
                  </p>
                </div>
                <div>
                  <span className="text-surface-400 font-medium">Comment Body:</span>
                  <div className="mt-1 p-3 rounded-xl bg-surface-50 border border-surface-200 text-surface-800 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {inspectModal.item.content}
                  </div>
                </div>
              </>
            )}

            {inspectModal.type === 'appeal' && (
              <>
                <div>
                  <span className="text-surface-400 font-medium">Appeal ID:</span>
                  <p className="font-mono text-surface-800 select-all">{inspectModal.item._id}</p>
                </div>
                <div>
                  <span className="text-surface-400 font-medium">Target Content:</span>
                  <p className="font-mono text-surface-800 uppercase font-semibold">
                    {inspectModal.item.contentType}: {inspectModal.item.contentId}
                  </p>
                </div>
                <div>
                  <span className="text-surface-400 font-medium">Appellant:</span>
                  <p className="text-surface-800">
                    @{inspectModal.item.appellant?.username} ({inspectModal.item.appellant?.email})
                  </p>
                </div>
                <div>
                  <span className="text-surface-400 font-medium">Appellant's Reason:</span>
                  <div className="mt-1 p-3 rounded-xl bg-surface-50 border border-surface-200 text-surface-800 whitespace-pre-wrap">
                    {inspectModal.item.reason}
                  </div>
                </div>
                {inspectModal.item.adminNote && (
                  <div>
                    <span className="text-brand-700 font-medium">Admin Decision Note:</span>
                    <div className="mt-1 p-3 rounded-xl bg-brand-50 border border-brand-200 text-brand-900">
                      {inspectModal.item.adminNote}
                    </div>
                  </div>
                )}
              </>
            )}

            {inspectModal.type === 'user' && (
              <>
                <div className="flex items-center gap-3 pb-2 border-b border-surface-100">
                  <Avatar name={inspectModal.item.username} size="lg" />
                  <div>
                    <h4 className="text-sm font-bold text-surface-900">@{inspectModal.item.username}</h4>
                    <p className="text-surface-500">{inspectModal.item.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-surface-700 pt-1">
                  <div>
                    <span className="text-surface-400 block">User ID:</span>
                    <span className="font-mono">{inspectModal.item._id}</span>
                  </div>
                  <div>
                    <span className="text-surface-400 block">Role:</span>
                    <span className="font-semibold">{inspectModal.item.role}</span>
                  </div>
                  <div>
                    <span className="text-surface-400 block">Status:</span>
                    <span className="font-semibold">{inspectModal.item.isSuspended ? 'Suspended' : 'Active'}</span>
                  </div>
                  <div>
                    <span className="text-surface-400 block">Points:</span>
                    <span className="font-semibold text-brand-600">{inspectModal.item.points || 0} pts</span>
                  </div>
                  <div>
                    <span className="text-surface-400 block">Member Since:</span>
                    <span>{formatDate(inspectModal.item.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-surface-400 block">Last Login:</span>
                    <span>{inspectModal.item.lastLoginAt ? formatDate(inspectModal.item.lastLoginAt) : 'Never'}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default AdminDashboardPage;
