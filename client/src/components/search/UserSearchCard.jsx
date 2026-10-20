import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, ArrowRight, User } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import Badge from '@/components/common/Badge';

export function UserSearchCard({ user, className = '' }) {
  if (!user) return null;

  return (
    <div
      className={`p-4 rounded-2xl bg-white border border-surface-200/90 shadow-card hover:shadow-modal hover:border-brand-300 transition-all duration-200 flex flex-col justify-between group ${className}`}
    >
      <div className="space-y-3">
        {/* User Identity Header */}
        <div className="flex items-start justify-between gap-3">
          <Link
            to={`/users/${user.username}`}
            className="flex items-center gap-3 min-w-0 group/author"
          >
            <Avatar
              name={user.username}
              src={user.profilePicture}
              size="lg"
              className="ring-2 ring-white shadow-xs group-hover/author:scale-105 transition-transform"
            />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-surface-900 group-hover/author:text-brand-600 transition-colors truncate">
                @{user.username}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {user.levelName && (
                  <Badge variant="primary" size="sm">
                    Level {user.level}: {user.levelName}
                  </Badge>
                )}
                {user.currentStreak > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
                    <span>{user.currentStreak}d</span>
                  </span>
                )}
              </div>
            </div>
          </Link>

          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-surface-100 text-surface-700 border border-surface-200/70 shrink-0">
            {user.points ?? 0} pts
          </span>
        </div>

        {/* Bio preview */}
        {user.bio ? (
          <p className="text-xs text-surface-600 line-clamp-2 leading-relaxed">
            {user.bio}
          </p>
        ) : (
          <p className="text-xs text-surface-400 italic">
            Student scholar with no bio yet.
          </p>
        )}
      </div>

      {/* Footer Action */}
      <div className="pt-3 mt-3 border-t border-surface-100 flex items-center justify-between text-xs">
        <span className="text-[11px] text-surface-400 font-medium flex items-center gap-1">
          <User className="w-3 h-3 text-surface-400" /> Student Profile
        </span>
        <Link
          to={`/users/${user.username}`}
          className="inline-flex items-center gap-1 font-semibold text-brand-600 group-hover:text-brand-700 hover:underline"
        >
          <span>View Profile</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

export default UserSearchCard;
