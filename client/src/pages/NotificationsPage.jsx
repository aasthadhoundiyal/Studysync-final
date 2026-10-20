import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Check,
  Heart,
  MessageSquare,
  CornerDownRight,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Inbox,
  AlertCircle,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Avatar from '@/components/common/Avatar';
import Tabs from '@/components/common/Tabs';
import EmptyState from '@/components/common/EmptyState';
import Skeleton from '@/components/common/Skeleton';
import { getNotifications, markAsRead, markAllAsRead } from '@/api/notifications';
import { useNotifications } from '@/context/NotificationContext';
import { useToast } from '@/context/ToastContext';
import { formatDate, getMediaUrl } from '@/utils/formatters';
import { cn } from '@/utils/cn';

/**
 * Type-specific icon and styling resolver.
 */
function getNotificationMeta(type) {
  switch (type) {
    case 'like':
      return {
        icon: <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />,
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200/80',
        label: 'Like',
        defaultActionLabel: 'View Post',
      };
    case 'comment':
      return {
        icon: <MessageSquare className="w-4 h-4 text-brand-600" />,
        badgeBg: 'bg-brand-50 text-brand-700 border-brand-200/80',
        label: 'Comment',
        defaultActionLabel: 'View Comment',
      };
    case 'reply':
      return {
        icon: <CornerDownRight className="w-4 h-4 text-indigo-600" />,
        badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
        label: 'Reply',
        defaultActionLabel: 'View Reply',
      };
    case 'share':
      return {
        icon: <Share2 className="w-4 h-4 text-teal-600" />,
        badgeBg: 'bg-teal-50 text-teal-700 border-teal-200/80',
        label: 'Share',
        defaultActionLabel: 'View Post',
      };
    case 'moderation_removed':
      return {
        icon: <ShieldAlert className="w-4 h-4 text-amber-600" />,
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200/80',
        label: 'Moderation',
        defaultActionLabel: 'Submit Appeal',
      };
    case 'appeal_reviewed':
      return {
        icon: <ShieldCheck className="w-4 h-4 text-purple-600" />,
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-200/80',
        label: 'Appeal',
        defaultActionLabel: 'View Appeals',
      };
    case 'post_restored':
      return {
        icon: <Sparkles className="w-4 h-4 text-emerald-600" />,
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        label: 'Restored',
        defaultActionLabel: 'View Post',
      };
    default:
      return {
        icon: <Bell className="w-4 h-4 text-surface-600" />,
        badgeBg: 'bg-surface-100 text-surface-700 border-surface-200',
        label: 'Alert',
        defaultActionLabel: 'View Details',
      };
  }
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { unreadCount, setUnreadCount, decrementUnread, refreshUnreadCount } = useNotifications();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1, hasMore: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState(null);
  const [markingIds, setMarkingIds] = useState(new Set());

  // Fetch notifications from the backend
  const fetchNotificationsList = useCallback(
    async (page = 1, append = false, isUnreadTab = activeTab === 'unread') => {
      if (page === 1) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const res = await getNotifications({
          page,
          limit: 15,
          unread: isUnreadTab,
        });

        if (res?.success) {
          const list = res.notifications || [];
          setNotifications((prev) => (append ? [...prev, ...list] : list));
          if (res.pagination) {
            setPagination(res.pagination);
          }
        } else {
          throw new Error(res?.message || 'Failed to load notifications');
        }
      } catch (err) {
        console.error('[Notifications Fetch Error]:', err);
        setError(err?.message || 'Unable to load notifications. Please try again.');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [activeTab]
  );

  // Trigger fetch on tab switch or mount
  useEffect(() => {
    fetchNotificationsList(1, false, activeTab === 'unread');
  }, [activeTab, fetchNotificationsList]);

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 && !notifications.some((n) => !n.isRead)) {
      toast.info('No unread notifications to mark.');
      return;
    }

    setIsMarkingAll(true);
    try {
      const res = await markAllAsRead();
      if (res?.success) {
        // Update local items to isRead: true
        setNotifications((prev) =>
          prev.map((item) => ({ ...item, isRead: true }))
        );
        setUnreadCount(0);
        toast.success(
          res.updatedCount
            ? `Marked ${res.updatedCount} notification${res.updatedCount === 1 ? '' : 's'} as read.`
            : 'All notifications marked as read.'
        );
        refreshUnreadCount(true);

        // If currently on unread tab, empty the list
        if (activeTab === 'unread') {
          setNotifications([]);
          setPagination((prev) => ({ ...prev, total: 0, hasMore: false }));
        }
      } else {
        throw new Error(res?.message || 'Could not mark all notifications read');
      }
    } catch (err) {
      console.error('[Mark All Read Error]:', err);
      toast.error(err?.message || 'Failed to mark all as read.');
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Mark a single notification as read
  const handleMarkOneAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    if (markingIds.has(id)) return;

    setMarkingIds((prev) => new Set(prev).add(id));
    try {
      const res = await markAsRead(id);
      if (res?.success) {
        setNotifications((prev) =>
          prev.map((item) => (item._id === id ? { ...item, isRead: true } : item))
        );
        decrementUnread(1);

        // If on unread tab, remove it from view
        if (activeTab === 'unread') {
          setNotifications((prev) => prev.filter((item) => item._id !== id));
          setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
        }
      }
    } catch (err) {
      console.error('[Mark Read Error]:', err);
      toast.error('Could not mark notification as read.');
    } finally {
      setMarkingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Handle clicking a notification card
  const handleNotificationClick = async (item) => {
    // If unread, mark read in the background
    if (!item.isRead) {
      handleMarkOneAsRead(item._id);
    }

    // Determine target route
    if (item.type === 'moderation_removed' || item.type === 'appeal_reviewed') {
      navigate('/appeals');
      return;
    }

    if (item.relatedPost) {
      const postId = typeof item.relatedPost === 'object' ? item.relatedPost._id : item.relatedPost;
      navigate(`/posts/${postId}`);
      return;
    }

    // Fallback if no reference
    toast.info('Referenced content is no longer available or was removed.');
  };

  // Navigate to actor profile
  const handleActorClick = (username, e) => {
    e.stopPropagation();
    if (username && username !== '[deleted]') {
      navigate(`/users/${username}`);
    }
  };

  // Filter tabs config
  const filterTabs = [
    {
      id: 'all',
      label: 'All Alerts',
      count: activeTab === 'all' ? pagination.total : undefined,
    },
    {
      id: 'unread',
      label: 'Unread',
      count: unreadCount > 0 ? unreadCount : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-surface-900 tracking-tight">
              Notification Center
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-surface-500 mt-1">
            Stay updated on your study posts, peer discussion replies, and academic alerts.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              fetchNotificationsList(1, false, activeTab === 'unread');
              refreshUnreadCount(true);
            }}
            disabled={isLoading}
            leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />}
            title="Refresh notifications"
          >
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll || unreadCount === 0}
            isLoading={isMarkingAll}
            leftIcon={<CheckCheck className="w-3.5 h-3.5" />}
            className="bg-white shadow-xs"
          >
            Mark all as read
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between gap-4 border-b border-surface-200/80 pb-3">
        <Tabs
          tabs={filterTabs}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId)}
          variant="pills"
          className="w-full sm:w-auto"
        />

        <div className="text-xs text-surface-400 hidden sm:block">
          {pagination.total} {pagination.total === 1 ? 'alert' : 'alerts'}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="truncate">{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNotificationsList(1, false, activeTab === 'unread')}
            className="bg-white text-xs shrink-0"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-white border border-surface-200/90 shadow-card flex items-start gap-3.5"
            >
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        /* Empty State */
        <EmptyState
          icon={activeTab === 'unread' ? <CheckCheck className="w-8 h-8 text-brand-600" /> : <Inbox className="w-8 h-8 text-surface-400" />}
          title={activeTab === 'unread' ? "You're all caught up!" : 'No notifications yet'}
          description={
            activeTab === 'unread'
              ? 'You have read all of your alerts and updates.'
              : 'When students like, comment on, or share your study materials, or when moderation updates occur, they will appear here.'
          }
          actionLabel={activeTab === 'unread' ? 'View All Alerts' : undefined}
          onAction={activeTab === 'unread' ? () => setActiveTab('all') : undefined}
        />
      ) : (
        /* Notification List */
        <div className="space-y-2.5">
          {notifications.map((item) => {
            const meta = getNotificationMeta(item.type);
            const isUnread = !item.isRead;
            const isPendingMark = markingIds.has(item._id);

            return (
              <div
                key={item._id}
                onClick={() => handleNotificationClick(item)}
                className={cn(
                  'group relative p-4 rounded-2xl border transition-all duration-150 cursor-pointer select-none flex items-start gap-3.5',
                  isUnread
                    ? 'bg-brand-50/25 hover:bg-brand-50/45 border-brand-200/90 shadow-subtle'
                    : 'bg-white hover:bg-surface-50/80 border-surface-200/90 shadow-card hover:border-surface-300'
                )}
              >
                {/* Left: Actor Avatar or System Shield */}
                <div className="relative shrink-0">
                  {item.actor ? (
                    <div
                      onClick={(e) => handleActorClick(item.actor.username, e)}
                      className="cursor-pointer transition-transform group-hover:scale-105"
                      title={`View @${item.actor.username}'s profile`}
                    >
                      <Avatar
                        name={item.actor.username}
                        src={getMediaUrl(item.actor.profilePicture)}
                        size="md"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-xs">
                      <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                    </div>
                  )}

                  {/* Corner Notification Type Icon Badge */}
                  <div
                    className={cn(
                      'absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border ring-2 ring-white shadow-xs',
                      meta.badgeBg
                    )}
                    title={meta.label}
                  >
                    {meta.icon}
                  </div>
                </div>

                {/* Center: Message, Actor & Timestamp */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="text-xs text-surface-800 leading-relaxed">
                    {item.actor ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => handleActorClick(item.actor.username, e)}
                          className="font-bold text-surface-900 hover:text-brand-600 transition-colors inline mr-1 text-left"
                        >
                          @{item.actor.username}
                        </button>
                        <span>
                          {/* Remove actor name from message if it already starts with it to avoid duplication */}
                          {item.message?.startsWith(item.actor.username)
                            ? item.message.slice(item.actor.username.length).trim()
                            : item.message}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-surface-900 mr-1">StudySync System</span>
                        <span>{item.message}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[11px] text-surface-400 font-medium">
                      {formatDate(item.createdAt)}
                    </span>

                    <span className="text-surface-300">•</span>

                    <span
                      className={cn(
                        'text-[10px] font-semibold px-2 py-0.2 rounded-full border',
                        meta.badgeBg
                      )}
                    >
                      {meta.label}
                    </span>

                    {item.relatedPost && (
                      <span className="text-[11px] text-brand-600 font-medium flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>{meta.defaultActionLabel}</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Unread Dot + Mark As Read Quick Action */}
                <div className="flex items-center gap-2 shrink-0 pt-1">
                  {isUnread && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => handleMarkOneAsRead(item._id, e)}
                        disabled={isPendingMark}
                        title="Mark as read"
                        aria-label="Mark notification as read"
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-surface-100 transition-all focus:opacity-100"
                      >
                        <Check className="w-4 h-4" />
                      </button>

                      <span
                        className="w-2.5 h-2.5 rounded-full bg-brand-600 ring-4 ring-brand-100 shrink-0"
                        title="Unread alert"
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Pagination: Load More Button */}
          {pagination.hasMore && (
            <div className="pt-4 text-center">
              <Button
                variant="outline"
                size="md"
                onClick={() => fetchNotificationsList(pagination.page + 1, true, activeTab === 'unread')}
                isLoading={isLoadingMore}
                disabled={isLoadingMore}
                className="w-full sm:w-auto min-w-[200px] bg-white shadow-xs"
              >
                {isLoadingMore ? 'Loading earlier alerts...' : 'Load More Notifications'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
