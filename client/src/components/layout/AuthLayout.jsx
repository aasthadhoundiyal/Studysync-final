import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { BookOpen, Sparkles, Flame, Users } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-[100dvh] bg-surface-50 flex flex-col justify-center py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-3 sm:mb-4">
        <Link to="/" className="inline-flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-600/30 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="font-bold text-xl sm:text-2xl tracking-tight text-surface-900">
            Study<span className="text-brand-600">Sync</span>
          </span>
        </Link>
        <p className="mt-1 text-xs text-surface-500">
          Peer knowledge sharing, AI study assistance, and daily streaks.
        </p>
      </div>

      {/* Auth Card Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md w-full">
        <div className="rounded-2xl bg-white border border-surface-200/90 p-5 sm:p-6 shadow-card">
          <Outlet />
        </div>

        {/* Value Prop Badges */}
        <div className="mt-3.5 grid grid-cols-3 gap-2 text-center text-[11px] text-surface-500">
          <div className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl bg-surface-100/70 border border-surface-200/50">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-medium text-[10px] text-surface-600">Study Streaks</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl bg-surface-100/70 border border-surface-200/50">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span className="font-medium text-[10px] text-surface-600">AI Summaries</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl bg-surface-100/70 border border-surface-200/50">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium text-[10px] text-surface-600">Community</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
