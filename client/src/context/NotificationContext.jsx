import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getUnreadCount, markAsRead, markAllAsRead } from '@/api/notifications';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const lastFetchedRef = useRef(0);

  // Fetch unread count from the backend
  const refreshUnreadCount = useCallback(async (force = false) => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    const now = Date.now();
    // Avoid repeated requests within 5 seconds unless forced
    if (!force && now - lastFetchedRef.current < 5000) {
      return;
    }

    try {
      setIsLoading(true);
      const res = await getUnreadCount();
      if (res && typeof res.unreadCount === 'number') {
        setUnreadCount(res.unreadCount);
        lastFetchedRef.current = Date.now();
      }
    } catch (err) {
      // Don't crash or trigger loud errors for unread badge background checks
      console.warn('[NotificationContext] Failed to fetch unread count:', err?.message);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Initial fetch when authenticated status changes
  useEffect(() => {
    if (isAuthenticated) {
      refreshUnreadCount(true);
    } else {
      setUnreadCount(0);
    }
  }, [isAuthenticated, user?._id, refreshUnreadCount]);

  // Soft refresh on visibility change (when user switches back to this tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        // Only refresh if more than 30 seconds have elapsed
        if (Date.now() - lastFetchedRef.current > 30000) {
          refreshUnreadCount(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, refreshUnreadCount]);

  // Listen for global custom update events
  useEffect(() => {
    const handleCustomUpdate = () => {
      refreshUnreadCount(true);
    };

    window.addEventListener('studysync:notifications-updated', handleCustomUpdate);
    return () => window.removeEventListener('studysync:notifications-updated', handleCustomUpdate);
  }, [refreshUnreadCount]);

  // Mark single notification read
  const markNotificationRead = useCallback(async (id) => {
    try {
      const res = await markAsRead(id);
      if (res?.success) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      return res;
    } catch (err) {
      console.error('[NotificationContext] Error marking notification read:', err);
      throw err;
    }
  }, []);

  // Mark all notifications read
  const markAllNotificationsRead = useCallback(async () => {
    try {
      const res = await markAllAsRead();
      if (res?.success) {
        setUnreadCount(0);
      }
      return res;
    } catch (err) {
      console.error('[NotificationContext] Error marking all notifications read:', err);
      throw err;
    }
  }, []);

  const decrementUnread = useCallback((count = 1) => {
    setUnreadCount((prev) => Math.max(0, prev - count));
  }, []);

  const value = {
    unreadCount,
    setUnreadCount,
    isLoading,
    refreshUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    decrementUnread,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;
