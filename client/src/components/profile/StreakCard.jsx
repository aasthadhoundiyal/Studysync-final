import React, { useState } from 'react';
import { Flame, Sparkles, CheckCircle2, Clock, AlertTriangle, RotateCcw, Info } from 'lucide-react';
import Button from '@/components/common/Button';
import RestoreStreakModal from './RestoreStreakModal';

export function StreakCard({
  currentStreak = 0,
  longestStreak = 0,
  postedToday = false,
  isStreakAlive = false,
  streakRestoresRemaining = 2,
  isOwnProfile = false,
  onStreakRestored,
  onOpenRestoreModal,
  className = '',
}) {
  const [internalShowModal, setInternalShowModal] = useState(false);

  // Eligible to restore when: user's own profile, streak is broken/dead, and restore tokens remain
  const canRestore = isOwnProfile && !isStreakAlive && streakRestoresRemaining > 0;
  const isAllowanceExhausted = isOwnProfile && streakRestoresRemaining <= 0;

  const handleRestoreClick = () => {
    if (onOpenRestoreModal) {
      onOpenRestoreModal();
    } else {
      setInternalShowModal(true);
    }
  };

  return (
    <>
      <div className={`p-4 rounded-2xl bg-white border border-surface-200/90 shadow-card ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-500">
              <Flame className="w-4 h-4 fill-amber-500" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-surface-900 leading-tight">Daily Posting Streak</h3>
              <p className="text-[10px] text-surface-400">Calendar Day Activity (UTC)</p>
            </div>
          </div>

          {postedToday ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" /> Completed Today
            </span>
          ) : isStreakAlive ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="w-3 h-3" /> Needs Post Today
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-100 text-surface-600 border border-surface-200">
              Streak Inactive
            </span>
          )}
        </div>

        {/* Big Streaks Display */}
        <div className="py-4 grid grid-cols-2 gap-4">
          <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
            <span className="text-[11px] font-medium text-amber-800 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Current Streak
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-950">
                {currentStreak}
              </span>
              <span className="text-xs font-semibold text-amber-700">
                {currentStreak === 1 ? 'Day' : 'Days'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-50 border border-surface-200/70">
            <span className="text-[11px] font-medium text-surface-600 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Longest Record
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-surface-900">
                {longestStreak}
              </span>
              <span className="text-xs font-semibold text-surface-500">
                {longestStreak === 1 ? 'Day' : 'Days'}
              </span>
            </div>
          </div>
        </div>

        {/* Today's Activity Status Banner */}
        <div className="pt-2 border-t border-surface-100 space-y-3">
          {postedToday ? (
            <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70 flex items-start gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Today's goal completed!</span>
                <span className="text-[11px] text-emerald-700 leading-snug">
                  {isOwnProfile
                    ? "You've published a study post today. Your streak will increase again tomorrow."
                    : "This student has published a post today and maintained their streak."}
                </span>
              </div>
            </div>
          ) : isStreakAlive ? (
            <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2 text-xs text-amber-900">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Active streak awaiting today's post</span>
                <span className="text-[11px] text-amber-800 leading-snug">
                  {isOwnProfile
                    ? "Share a question, note, or study summary before UTC midnight to maintain your streak."
                    : "Streak remains alive until UTC midnight."}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-surface-100 border border-surface-200 flex items-start gap-2 text-xs text-surface-700">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Streak broken</span>
                <span className="text-[11px] text-surface-500 leading-snug">
                  {isOwnProfile
                    ? "No post was made yesterday. Your next post will start a fresh streak."
                    : "No post was created yesterday. Next post will start a fresh streak."}
                </span>
              </div>
            </div>
          )}

          {/* Monthly Restorations Section (Owner Profile) */}
          {isOwnProfile ? (
            <div className="p-3 rounded-xl bg-surface-50 border border-surface-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-surface-800 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-brand-600" /> Monthly Streak Restores
                </span>
                <span className="text-xs font-bold text-surface-900">
                  {streakRestoresRemaining} / 2 remaining
                </span>
              </div>

              {canRestore ? (
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-surface-200/60">
                  <span className="text-[11px] text-amber-800 font-medium leading-tight">
                    Restore token available! Revive your streak now.
                  </span>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleRestoreClick}
                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                    className="bg-amber-600 hover:bg-amber-700 text-xs shrink-0 shadow-xs"
                  >
                    Restore Streak
                  </Button>
                </div>
              ) : isStreakAlive ? (
                <p className="text-[11px] text-surface-500 pt-1 border-t border-surface-200/60 flex items-center gap-1">
                  <Info className="w-3 h-3 text-surface-400 shrink-0" />
                  <span>Streak is currently active — restore tokens are reserved for when a day is missed.</span>
                </p>
              ) : isAllowanceExhausted ? (
                <p className="text-[11px] text-rose-600 font-medium pt-1 border-t border-surface-200/60 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                  <span>Monthly allowance exhausted (0 / 2). Allowance resets on the 1st of next month.</span>
                </p>
              ) : null}
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-surface-50 border border-surface-200/70 text-[11px] text-surface-500 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-surface-400 shrink-0" />
              <span>Streak counters update based on calendar-day posting activity (UTC).</span>
            </div>
          )}
        </div>
      </div>

      {isOwnProfile && !onOpenRestoreModal && (
        <RestoreStreakModal
          isOpen={internalShowModal}
          onClose={() => setInternalShowModal(false)}
          streakInfo={{ currentStreak, longestStreak, streakRestoresRemaining }}
          onStreakRestored={(newStreak) => {
            onStreakRestored?.(newStreak);
          }}
        />
      )}
    </>
  );
}

export default StreakCard;
