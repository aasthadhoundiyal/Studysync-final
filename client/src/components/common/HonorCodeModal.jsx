import React from 'react';
import { ShieldCheck, BookOpen, CheckCircle2, AlertTriangle, Users } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

/**
 * StudySync Academic Honor Code & Community Guidelines Modal
 */
export function HonorCodeModal({ isOpen, onClose, onAccept }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="StudySync Academic Honor Code"
      description="Guidelines for ethical peer collaboration, sharing notes, and learning integrity"
      maxWidth="max-w-lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <p className="text-[11px] text-surface-500 hidden sm:block">
            Required for all StudySync student accounts.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            {onAccept && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onAccept();
                  onClose();
                }}
              >
                I Agree &amp; Accept
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-3.5 text-xs text-surface-600 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
        {/* Banner */}
        <div className="p-3 rounded-xl bg-brand-50/80 border border-brand-200/80 flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="font-semibold text-brand-900 text-xs">Our Commitment to Real Learning</h4>
            <p className="text-brand-700 text-[11px]">
              StudySync is built for genuine understanding, student notes, and peer assistance. We uphold academic honesty and ethical scholarship.
            </p>
          </div>
        </div>

        {/* 4 Core Principles */}
        <div className="space-y-2.5">
          <div className="p-3 rounded-xl border border-surface-200/80 bg-surface-50/60">
            <div className="flex items-center gap-2 font-semibold text-surface-900 text-xs mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>1. Authentic Peer Knowledge Sharing</span>
            </div>
            <p className="text-surface-600 pl-6 text-[11px] leading-normal">
              Share your own study summaries, lecture notes, diagrams, and practice problems. Discussions should guide peers toward grasping core concepts rather than copying graded homework.
            </p>
          </div>

          <div className="p-3 rounded-xl border border-surface-200/80 bg-surface-50/60">
            <div className="flex items-center gap-2 font-semibold text-surface-900 text-xs mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>2. Strict Ban on Live Exams &amp; Assessment Dumps</span>
            </div>
            <p className="text-surface-600 pl-6 text-[11px] leading-normal">
              Posting unreleased exam questions, live test answers, or unauthorized instructor solutions is strictly prohibited and results in immediate account suspension.
            </p>
          </div>

          <div className="p-3 rounded-xl border border-surface-200/80 bg-surface-50/60">
            <div className="flex items-center gap-2 font-semibold text-surface-900 text-xs mb-1">
              <BookOpen className="w-4 h-4 text-brand-600 shrink-0" />
              <span>3. Ethical AI &amp; Source Attribution</span>
            </div>
            <p className="text-surface-600 pl-6 text-[11px] leading-normal">
              When citing textbooks, academic papers, or AI summaries, provide proper attribution. Never represent plagiarized content as your own original work.
            </p>
          </div>

          <div className="p-3 rounded-xl border border-surface-200/80 bg-surface-50/60">
            <div className="flex items-center gap-2 font-semibold text-surface-900 text-xs mb-1">
              <Users className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>4. Respectful &amp; Inclusive Community</span>
            </div>
            <p className="text-surface-600 pl-6 text-[11px] leading-normal">
              Treat all peers with respect. Harassment, discrimination, or abusive conduct will result in streak resets and account deactivation.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default HonorCodeModal;
