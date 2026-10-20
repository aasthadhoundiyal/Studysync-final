import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  X,
  BookOpen,
  Home,
  Search,
  PlusSquare,
  Bookmark,
  Bell,
  User,
  ShieldAlert,
  LogOut,
  Flame,
  Award,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { getLevelTier } from '@/utils/formatters';
import Avatar from '@/components/common/Avatar';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import NavItem from './NavItem';

export function MobileDrawer({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { unreadCount } = useNotifications();

  // Close drawer on route change
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [location.pathname, isOpen, onClose]);

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login');
  };

  const tier = getLevelTier(user?.points || 0);

  const baseNavLinks = [
    { label: 'Home Feed', path: '/', icon: <Home className="w-4 h-4" /> },
    { label: 'Explore & Search', path: '/search', icon: <Search className="w-4 h-4" /> },
    { label: 'Create Post', path: '/create', icon: <PlusSquare className="w-4 h-4" /> },
    { label: 'Bookmarks', path: '/saved', icon: <Bookmark className="w-4 h-4" /> },
    {
      label: 'Notifications',
      path: '/notifications',
      icon: <Bell className="w-4 h-4" />,
      badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
    },
    { label: 'Profile', path: '/profile', icon: <User className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-modal flex flex-col z-10 animate-in slide-in-from-left duration-250">
        {/* Drawer Header */}
        <div className="h-16 px-4 border-b border-surface-200 flex items-center justify-between">
          <Link to="/" onClick={onClose} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-sm shadow-brand-600/25">
              <BookOpen className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="font-bold text-base tracking-tight text-surface-900">
              Study<span className="text-brand-600">Sync</span>
            </span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-900 hover:bg-surface-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info / Guest Card */}
        <div className="p-4 border-b border-surface-100 bg-surface-50/60">
          {isAuthenticated ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar
                  name={user?.username || 'Student'}
                  src={user?.profilePicture}
                  size="md"
                  status="online"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-surface-900 truncate">
                      @{user?.username}
                    </span>
                    {isAdmin && (
                      <Badge variant="brand" size="sm">
                        Admin
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-brand-600 font-medium truncate block">
                    {user?.levelName || tier.name}
                  </span>
                  <span className="text-[11px] text-surface-500 truncate block">
                    {user?.email}
                  </span>
                </div>
              </div>

              {/* Streak and points bar */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-white border border-surface-200/80 flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <div>
                    <span className="font-bold text-surface-900">
                      {user?.currentStreak || 0}
                    </span>{' '}
                    <span className="text-surface-400">streak</span>
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-white border border-surface-200/80 flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 text-brand-600" />
                  <div>
                    <span className="font-bold text-surface-900">{user?.points || 0}</span>{' '}
                    <span className="text-surface-400">pts</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div>
                <p className="text-xs font-semibold text-surface-900">Welcome to StudySync</p>
                <p className="text-[11px] text-surface-500 mt-0.5">
                  Sign in to post questions, save bookmarks, and build study streaks.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/login" onClick={onClose}>
                  <Button variant="outline" size="sm" leftIcon={<LogIn className="w-3.5 h-3.5" />} className="w-full justify-center">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register" onClick={onClose}>
                  <Button variant="primary" size="sm" leftIcon={<UserPlus className="w-3.5 h-3.5" />} className="w-full justify-center">
                    Register
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider px-3 py-1">
            Menu
          </div>

          {baseNavLinks.map((item) => (
            <NavItem
              key={item.path}
              to={item.path}
              label={item.label}
              icon={item.icon}
              end={item.path === '/'}
              onClick={onClose}
            />
          ))}

          {isAdmin && (
            <div className="pt-2">
              <div className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider px-3 py-1">
                Administration
              </div>
              <NavItem
                to="/admin"
                label="Admin Hub"
                icon={<ShieldAlert className="w-4 h-4 text-brand-600" />}
                adminBadge
                onClick={onClose}
              />
            </div>
          )}
        </div>

        {/* Drawer Footer with Logout (if auth) */}
        {isAuthenticated && (
          <div className="p-3 border-t border-surface-200 bg-white">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MobileDrawer;
