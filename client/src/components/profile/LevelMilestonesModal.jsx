import React from 'react';
import { CheckCircle2, Lock, Sparkles, Heart, MessageSquare, Share2 } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import { LEVEL_TIERS } from '@/utils/formatters';

export function LevelMilestonesModal({ isOpen, onClose, userPoints = 0, currentLevel = 1 }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="StudySync Academic Level Roadmap"
      description="Gamification levels are earned through peer engagement on your published study notes and questions."
      maxWidth="max-w-lg"
      footer={
        <Button variant="primary" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-6">
        {/* How to Earn Points Summary */}
        <div className="p-4 rounded-2xl bg-gradient-to-tr from-brand-50 to-indigo-50/60 border border-brand-100">
          <h4 className="text-xs font-bold text-brand-950 flex items-center gap-1.5 mb-2">
            <Sparkles className="w-4 h-4 text-brand-600" /> How You Earn Points
          </h4>
          <p className="text-[11px] text-brand-800 leading-relaxed mb-3">
            Points are automatically awarded to your profile when fellow students interact with your study materials. Self-interactions earn zero points.
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 bg-white rounded-xl border border-brand-200/60 shadow-xs">
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 mx-auto mb-1" />
              <span className="font-bold text-surface-900 block">+1 pt</span>
              <span className="text-[10px] text-surface-500">Per Like</span>
            </div>
            <div className="p-2 bg-white rounded-xl border border-brand-200/60 shadow-xs">
              <MessageSquare className="w-3.5 h-3.5 text-brand-600 mx-auto mb-1" />
              <span className="font-bold text-surface-900 block">+2 pts</span>
              <span className="text-[10px] text-surface-500">Per Comment</span>
            </div>
            <div className="p-2 bg-white rounded-xl border border-brand-200/60 shadow-xs">
              <Share2 className="w-3.5 h-3.5 text-indigo-600 mx-auto mb-1" />
              <span className="font-bold text-surface-900 block">+3 pts</span>
              <span className="text-[10px] text-surface-500">Per Share</span>
            </div>
          </div>
        </div>

        {/* Level Tiers Ladder */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-surface-900 uppercase tracking-wider px-1">
            Academic Level Milestones
          </h4>

          <div className="space-y-2">
            {LEVEL_TIERS.map((tier) => {
              const isAchieved = userPoints >= tier.minPoints;
              const isCurrent = currentLevel === tier.level;

              return (
                <div
                  key={tier.level}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-brand-50/70 border-brand-300 ring-2 ring-brand-500/20 shadow-xs'
                      : isAchieved
                      ? 'bg-surface-50/60 border-surface-200/90'
                      : 'bg-white border-surface-100 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isCurrent
                          ? 'bg-brand-600 text-white shadow-xs'
                          : isAchieved
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-surface-100 text-surface-400'
                      }`}
                    >
                      {tier.level}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-surface-900">
                          {tier.name}
                        </span>
                        {isCurrent && (
                          <Badge variant="primary" size="sm">
                            Current Level
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-surface-500">
                        Requires {tier.minPoints} {tier.minPoints === 1 ? 'point' : 'points'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {isCurrent ? (
                      <span className="text-xs font-bold text-brand-700">
                        Active Tier
                      </span>
                    ) : isAchieved ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Achieved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-surface-400">
                        <Lock className="w-3 h-3" /> {tier.minPoints - userPoints} pts away
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default LevelMilestonesModal;
