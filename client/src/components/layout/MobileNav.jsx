import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, PlusCircle, Bell, User } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { cn } from '@/utils/cn';

/**
 * Mobile bottom navigation bar.
 * Compact, responsive, with zero horizontal overflow and clear touch targets.
 */
export function MobileNav() {
  const { unreadCount } = useNotifications();

  const items = [
    { label: 'Home', path: '/', icon: <Home className="w-5 h-5" /> },
    { label: 'Search', path: '/search', icon: <Search className="w-5 h-5" /> },
    {
      label: 'Create',
      path: '/create',
      icon: <PlusCircle className="w-6 h-6 text-brand-600" />,
      highlight: true,
    },
    {
      label: 'Alerts',
      path: '/notifications',
      icon: <Bell className="w-5 h-5" />,
      badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : null,
    },
    { label: 'Profile', path: '/profile', icon: <User className="w-5 h-5" /> },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-surface-200/90 md:hidden py-1 px-3 shadow-lg"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-[10px] font-medium transition-colors select-none min-w-[54px]',
                isActive
                  ? 'text-brand-600 font-bold'
                  : 'text-surface-500 hover:text-surface-900 active:text-brand-600'
              )
            }
          >
            <span
              className={cn(
                'relative mb-0.5 transition-transform duration-150',
                item.highlight && 'scale-110 drop-shadow-sm'
              )}
            >
              {item.icon}
              {item.badge && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-brand-600 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white shadow-xs">
                  {item.badge}
                </span>
              )}
            </span>
            <span className="leading-tight">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default MobileNav;
