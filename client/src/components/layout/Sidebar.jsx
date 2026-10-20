import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Search,
  PlusSquare,
  Bell,
  Bookmark,
  User,
  ShieldAlert,
  Flame,
  Award,
  Sparkles,
  LogIn,
  UserPlus,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { getLevelTier } from '@/utils/formatters';
import Avatar from '@/components/common/Avatar';
import NavItem from './NavItem';

export function Sidebar() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { unreadCount } = useNotifications();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Home Feed', path: '/', icon: <Home className="w-4 h-4" /> },
    { label: 'Search & Explore', path: '/search', icon: <Search className="w-4 h-4" /> },
    { label: 'Create Post', path: '/create', icon: <PlusSquare className="w-4 h-4" /> },
    { label: 'Bookmarks', path: '/saved', icon: <Bookmark className="w-4 h-4" /> },
    {
      label: 'Notifications',
      path: '/notifications',
      icon: <Bell className="w-4 h-4" />,
      badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
    },
    { label: 'My Profile', path: '/profile', icon: <User className="w-4 h-4" /> },
  ];

  const tier = getLevelTier(user?.points || 0);

  return (
    <aside className="w-64 shrink-0 hidden md:block">
      <div className="sticky top-20 space-y-4">
        {/* User Mini-Profile Card (Authenticated) */}
        {isAuthenticated && (
          <div className="rounded-2xl bg-white border border-surface-200/90 p-3.5 shadow-card flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar
                name={user?.username || 'Student'}
                src={user?.profilePicture}
                size="sm"
                status="online"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-surface-900 truncate leading-tight">
                  @{user?.username}
                </p>
                <p className="text-[10px] text-brand-600 font-medium truncate leading-tight mt-0.5">
                  {user?.levelName || tier.name}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200/60 shrink-0">
              {user?.points || 0} pts
            </span>
          </div>
        )}

        {/* Primary Navigation Links */}
        <nav className="rounded-2xl bg-white border border-surface-200/90 p-2 shadow-card space-y-1">
          {navItems.map((item) => (
            <NavItem
              key={item.path}
              to={item.path}
              label={item.label}
              icon={item.icon}
              end={item.path === '/'}
            />
          ))}

          {isAdmin && (
            <div className="pt-2 border-t border-surface-100">
              <NavItem
                to="/admin"
                label="Admin Hub"
                icon={<ShieldAlert className="w-4 h-4 text-brand-600" />}
                adminBadge
              />
            </div>
          )}
        </nav>

        {/* Study Gamification & Streak Widget (Authenticated) */}
        {isAuthenticated ? (
          <div className="rounded-2xl bg-gradient-to-br from-indigo-900 via-brand-900 to-indigo-950 p-4 text-white shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-amber-400">
                  <Flame className="w-4 h-4 fill-amber-400" />
                </div>
                <span className="text-xs font-semibold tracking-tight">Study Streak</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {user?.currentStreak > 0 ? 'Active' : 'Start Today'}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold tracking-tight">
                {user?.currentStreak || 0} {user?.currentStreak === 1 ? 'Day' : 'Days'}
              </span>
              <span className="text-[11px] text-white/70">
                Record: {user?.longestStreak || 0}d
              </span>
            </div>

            <div className="w-full bg-white/10 rounded-full h-1.5 mb-3">
              <div
                className="bg-amber-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(8, ((user?.currentStreak || 0) / 7) * 100))}%` }}
              />
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-white/80">
              <span className="flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-brand-300" /> {user?.points || 0} Points
              </span>
              <span className="text-white/60">{user?.levelName || tier.name}</span>
            </div>
          </div>
        ) : (
          /* Guest Welcome Box */
          <div className="rounded-2xl bg-white border border-surface-200/90 p-4 shadow-card text-center space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 mx-auto">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-surface-900">
                Join StudySync Today
              </h4>
              <p className="text-[11px] text-surface-500 mt-1 leading-relaxed">
                Connect with study peers, generate AI quizzes from notes, and track your daily streaks.
              </p>
            </div>
            <div className="pt-1 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-colors shadow-sm shadow-brand-600/20"
              >
                <UserPlus className="w-3.5 h-3.5" /> Create Account
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-surface-50 hover:bg-surface-100 text-surface-700 border border-surface-200 text-xs font-medium transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In
              </button>
            </div>
          </div>
        )}

        {/* Quick Sign Out Action (when authenticated) */}
        {isAuthenticated && (
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium text-surface-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
