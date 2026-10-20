import React, { useState } from 'react';
import { RotateCcw, ShieldCheck } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import Alert from '@/components/common/Alert';
import { restoreStreak } from '@/api/users';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export function RestoreStreakModal({
  isOpen,
  onClose,
  streakInfo,
  onStreakRestored,
}) {
  const { updateUser, refreshUser } = useAuth();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const tokensRemaining = streakInfo?.streakRestoresRemaining ?? 0;

  const handleConfirmRestore = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await restoreStreak();
      if (res?.success && res?.streak) {
        // Update user state in AuthContext
        updateUser({
          currentStreak: res.streak.currentStreak,
          longestStreak: res.streak.longestStreak,
          streakRestoresRemaining: res.streak.streakRestoresRemaining,
        });
        refreshUser();

        // Callback to update parent ProfilePage state
        onStreakRestored?.(res.streak);

        if (res.alreadyRestored) {
          toast.info('Your streak was already restored today.');
        } else {
          toast.success(
            `Study streak revived to ${res.streak.currentStreak} ${
              res.streak.currentStreak === 1 ? 'day' : 'days'
            }! Remember to post today to keep it active.`
          );
        }

        onClose();
      } else {
        throw new Error(res?.message || 'Failed to restore streak');
      }
    } catch (err) {
      console.error('[Streak Restore Error]:', err);
      const msg = err?.message || 'Could not restore streak. Please check eligibility.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title="Restore Broken Study Streak"
      description="Use 1 of your monthly recovery tokens to revive your broken streak."
      maxWidth="max-w-md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            disabled={isSubmitting || tokensRemaining <= 0}
            onClick={handleConfirmRestore}
            className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 shadow-amber-600/20"
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            {isSubmitting ? 'Restoring Streak...' : 'Confirm & Restore'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <Alert variant="error" title="Restoration Failed">
            {error}
          </Alert>
        )}

        {/* Token Balance Change Preview */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-amber-600" /> Token Consumption
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-200 text-amber-900">
              1 Token
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-amber-200/60 text-xs">
            <div>
              <span className="text-[11px] text-amber-700 block">Current Balance:</span>
              <span className="text-base font-bold text-amber-950">
                {tokensRemaining} / 2 tokens
              </span>
            </div>
            <div>
              <span className="text-[11px] text-amber-700 block">Balance After Restore:</span>
              <span className="text-base font-bold text-amber-950">
                {Math.max(0, tokensRemaining - 1)} / 2 tokens
              </span>
            </div>
          </div>
        </div>

        {/* How Restoration Works */}
        <div className="p-3.5 rounded-xl bg-surface-50 border border-surface-200 space-y-2 text-xs text-surface-600">
          <div className="font-semibold text-surface-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-brand-600" /> Streak Recovery Policy:
          </div>
          <ul className="space-y-1.5 text-[11px] list-disc list-inside leading-relaxed text-surface-600">
            <li>
              Your previous daily streak counter will be revived.
            </li>
            <li>
              Your last active date will be credited as <strong>yesterday</strong>, keeping your streak alive.
            </li>
            <li>
              <strong>Action required:</strong> You must create a study post <strong>today</strong> before UTC midnight to maintain the revived streak.
            </li>
            <li>
              Each student receives 2 streak restore tokens per calendar month.
            </li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}

export default RestoreStreakModal;
