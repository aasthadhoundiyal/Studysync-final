import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Search,
  PlusCircle,
  Bell,
  Bookmark,
  Shield,
  User,
  LogOut,
  ChevronDown,
  LogIn,
  UserPlus,
  Menu,
  X,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Avatar from '@/components/common/Avatar';
import Badge from '@/components/common/Badge';
import Dropdown from '@/components/common/Dropdown';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';

/**
 * Top navigation bar for StudySync.
 * Features brand logo, global search, backend health status, quick actions,
 * user profile dropdown, and mobile menu trigger.
 */
export function TopBar({ onOpenMobileMenu }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Synchronize searchQuery with URL query parameter when navigating
  useEffect(() => {
    if (location.pathname === '/search') {
      const params = new URLSearchParams(location.search);
      setSearchQuery(params.get('q') || '');
    }
  }, [location.pathname, location.search]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    } else if (location.pathname === '/search') {
      navigate('/search');
    }
    setShowMobileSearch(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    if (location.pathname === '/search') {
      navigate('/search');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      label: (
        <div className="py-0.5 text-left">
          <p className="font-semibold text-surface-900 leading-tight">
            @{user?.username || 'student'}
          </p>
          <p className="text-[10px] text-surface-400 truncate max-w-[160px]">
            {user?.email || 'student@university.edu'}
          </p>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    {
      label: 'My Profile',
      icon: <User className="w-4 h-4" />,
      onClick: () => navigate('/profile'),
    },
    {
      label: 'Saved Bookmarks',
      icon: <Bookmark className="w-4 h-4" />,
      onClick: () => navigate('/saved'),
    },
    {
      label: 'Notifications',
      icon: <Bell className="w-4 h-4" />,
      badge: unreadCount > 0 ? (
        <Badge variant="brand" size="sm">
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      ) : undefined,
      onClick: () => navigate('/notifications'),
    },
    ...(isAdmin
      ? [
          {
            label: 'Admin Hub',
            icon: <Shield className="w-4 h-4 text-brand-600" />,
            badge: <Badge variant="brand" size="sm">Admin</Badge>,
            onClick: () => navigate('/admin'),
          },
        ]
      : []),
    { type: 'divider' },
    {
      label: 'Sign Out',
      icon: <LogOut className="w-4 h-4" />,
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-surface-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left Side: Mobile Menu Button + Brand Logo */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="relative p-2 -ml-2 rounded-xl text-surface-600 hover:text-surface-900 hover:bg-surface-100 md:hidden transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-600 ring-2 ring-white" />
            )}
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-sm shadow-brand-600/25 group-hover:scale-105 transition-transform shrink-0">
              <BookOpen className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-surface-900 group-hover:text-brand-600 transition-colors">
                Study<span className="text-brand-600">Sync</span>
              </span>
              <span className="text-[10px] text-surface-400 font-medium -mt-1 hidden sm:inline">
                Academic Community
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Global Search Bar (Desktop & Tablets) */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex-1 max-w-md hidden sm:flex items-center relative"
        >
          <Search className="w-4 h-4 text-surface-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, questions, tags, or topics..."
            className="w-full pl-10 pr-8 py-2 text-xs bg-surface-100/80 hover:bg-surface-100 focus:bg-white border border-surface-200 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-surface-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 text-surface-400 hover:text-surface-700 p-0.5"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Right Side: Quick Actions, Mobile Search Trigger, Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Mobile Search Icon Toggle */}
          <button
            type="button"
            onClick={() => setShowMobileSearch((prev) => !prev)}
            className="p-2 rounded-xl text-surface-600 hover:text-surface-900 hover:bg-surface-100 sm:hidden transition-colors"
            aria-label="Toggle search"
          >
            <Search className="w-5 h-5" />
          </button>

          {isAuthenticated ? (
            <>
              {/* Quick Create Post (Desktop) */}
              <Button
                variant="primary"
                size="sm"
                leftIcon={<PlusCircle className="w-4 h-4" />}
                onClick={() => navigate('/create')}
                className="hidden sm:inline-flex"
              >
                Create Post
              </Button>

              {/* Notifications */}
              <Link
                to="/notifications"
                className="relative p-2 rounded-xl text-surface-600 hover:text-surface-900 hover:bg-surface-100 transition-colors"
                title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'Notifications'}
                aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Saved Bookmarks (Desktop) */}
              <Link
                to="/saved"
                className="p-2 rounded-xl text-surface-600 hover:text-surface-900 hover:bg-surface-100 transition-colors hidden md:inline-flex"
                title="Saved Bookmarks"
              >
                <Bookmark className="w-5 h-5" />
              </Link>

              {/* User Profile Pill & Dropdown */}
              <div className="pl-1 sm:pl-2 border-l border-surface-200 flex items-center">
                <Dropdown
                  align="right"
                  trigger={
                    <div className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-surface-100 transition-colors cursor-pointer select-none">
                      <Avatar
                        name={user?.username || 'Student'}
                        src={user?.profilePicture}
                        size="sm"
                        status="online"
                      />
                      <div className="hidden lg:flex flex-col text-left">
                        <span className="text-xs font-semibold text-surface-900 leading-tight truncate max-w-[120px]">
                          @{user?.username || 'student'}
                        </span>
                        <span className="text-[10px] text-brand-600 font-medium leading-tight">
                          {user?.role === 'admin' ? 'Admin' : `${user?.points || 0} pts`}
                        </span>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-surface-400 hidden lg:inline" />
                    </div>
                  }
                  items={userMenuItems}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm" leftIcon={<LogIn className="w-4 h-4" />}>
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Expandable Mobile Search Row */}
      {showMobileSearch && (
        <div className="sm:hidden px-4 pb-3 pt-1 border-t border-surface-100 bg-white animate-in slide-in-from-top-2 duration-150">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="w-4 h-4 text-surface-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes, questions, tags..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2 text-surface-400 hover:text-surface-700 p-1"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>
      )}
    </header>
  );
}

export default TopBar;
