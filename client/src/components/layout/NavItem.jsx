import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/utils/cn';

/**
 * Reusable StudySync navigation link component.
 * Supports active route indicator, icon, badges, admin pills, and click callbacks.
 */
export function NavItem({
  to,
  label,
  icon,
  badge,
  adminBadge,
  end = false,
  onClick,
  className,
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 select-none outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
          isActive
            ? 'bg-brand-50 text-brand-700 font-semibold shadow-subtle'
            : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100/80 active:bg-surface-200/60',
          className
        )
      }
    >
      {({ isActive }) => (
        <>
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <span
                className={cn(
                  'shrink-0 transition-colors',
                  isActive
                    ? 'text-brand-600'
                    : 'text-surface-400 group-hover:text-surface-700'
                )}
              >
                {icon}
              </span>
            )}
            <span className="truncate">{label}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {badge !== undefined && badge !== null && (
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors',
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'bg-surface-200 text-surface-700 group-hover:bg-surface-300'
                )}
              >
                {badge}
              </span>
            )}
            {adminBadge && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-100 text-brand-700 uppercase tracking-wider">
                Admin
              </span>
            )}
            {/* Active subtle left-bar indicator */}
            {isActive && (
              <span className="absolute left-0 top-2 bottom-2 w-1 bg-brand-600 rounded-r-full" />
            )}
          </div>
        </>
      )}
    </NavLink>
  );
}

export default NavItem;
