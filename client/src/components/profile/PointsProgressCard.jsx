import React, { useState } from 'react';
import { Award, ChevronRight, Sparkles, Trophy } from 'lucide-react';
import Badge from '@/components/common/Badge';
import { LEVEL_TIERS } from '@/utils/formatters';
import LevelMilestonesModal from './LevelMilestonesModal';

export function PointsProgressCard({
  points = 0,
  level = 1,
  levelName = 'Beginner',
  nextLevel = null,
  nextLevelName = null,
  pointsToNextLevel = null,
  className = '',
}) {
  const [showMilestonesModal, setShowMilestonesModal] = useState(false);

  // Compute tier thresholds
  const currentTier = LEVEL_TIERS.find((t) => t.level === level) || LEVEL_TIERS[0];
  const nextTier = nextLevel ? LEVEL_TIERS.find((t) => t.level === nextLevel) : null;

  let progressPercent = 100;
  if (nextTier) {
    const range = nextTier.minPoints - currentTier.minPoints;
    const gainedInRange = Math.max(0, points - currentTier.minPoints);
    progressPercent = range > 0 ? Math.min(100, Math.round((gainedInRange / range) * 100)) : 100;
  }

  return (
    <>
      <div className={`p-4 rounded-2xl bg-white border border-surface-200/90 shadow-card ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-surface-900 leading-tight">Academic Level</h3>
              <p className="text-[10px] text-surface-400">Peer Gamification Points</p>
            </div>
          </div>

          <Badge variant="primary" size="md">
            Level {level} • {levelName}
          </Badge>
        </div>

        {/* Big Points Display */}
        <div className="py-4 flex items-baseline justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-surface-900 tracking-tight">
                {points}
              </span>
              <span className="text-xs font-semibold text-surface-400 uppercase">Points</span>
            </div>
            <p className="text-[11px] text-surface-500 mt-0.5">
              Awarded when peers like, comment on, and share your notes.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowMilestonesModal(true)}
            className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline p-1"
          >
            <span>Roadmap</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress Toward Next Level */}
        <div className="space-y-1.5 pt-2 border-t border-surface-100">
          <div className="flex items-center justify-between text-xs">
            {nextTier ? (
              <>
                <span className="text-surface-600 flex items-center gap-1 font-medium text-[11px]">
                  <Sparkles className="w-3 h-3 text-brand-500" />
                  <span>{pointsToNextLevel} pts to Level {nextLevel} ({nextLevelName})</span>
                </span>
                <span className="text-[11px] font-bold text-surface-700">{progressPercent}%</span>
              </>
            ) : (
              <span className="text-xs font-bold text-purple-700 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-purple-600" /> Max Level Scholar Achieved!
              </span>
            )}
          </div>

          <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-brand-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <LevelMilestonesModal
        isOpen={showMilestonesModal}
        onClose={() => setShowMilestonesModal(false)}
        userPoints={points}
        currentLevel={level}
      />
    </>
  );
}

export default PointsProgressCard;
