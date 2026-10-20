import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Hash,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import Badge from '@/components/common/Badge';
import HonorCodeModal from '@/components/common/HonorCodeModal';

export function RightSidebar() {
  const navigate = useNavigate();
  const [showHonorModal, setShowHonorModal] = useState(false);

  const trendingTags = [
    { name: 'algorithms', posts: '42' },
    { name: 'calculus', posts: '35' },
    { name: 'neuroscience', posts: '28' },
    { name: 'data-structures', posts: '19' },
    { name: 'organic-chem', posts: '15' },
  ];

  return (
    <aside className="w-80 shrink-0 hidden xl:block">
      <div className="sticky top-20 space-y-4">
        {/* AI Study Tools Callout */}
        <div className="rounded-2xl bg-gradient-to-tr from-brand-50 to-indigo-50/50 border border-brand-100 p-4 shadow-subtle">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-brand-600 flex items-center justify-center text-white">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-brand-900">StudySync AI Suite</span>
          </div>
          <p className="text-xs text-brand-800 leading-relaxed">
            Turn student notes into <strong>interactive MCQs</strong>, instant summaries, and extracted topic keywords for efficient revision.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge variant="brand" size="sm">Quiz Generator</Badge>
            <Badge variant="brand" size="sm">Key Takeaways</Badge>
            <Badge variant="brand" size="sm">Auto-Moderation</Badge>
          </div>
        </div>

        {/* Trending Study Topics */}
        <div className="rounded-2xl bg-white border border-surface-200/90 p-4 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-surface-900 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-brand-600" /> Trending Topics
            </h4>
            <span className="text-[10px] text-surface-400">Active today</span>
          </div>
          <div className="space-y-1">
            {trendingTags.map((tag) => (
              <button
                key={tag.name}
                type="button"
                onClick={() => navigate(`/search?tag=${tag.name}`)}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-surface-50 text-left transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-surface-400 group-hover:text-brand-600 transition-colors" />
                  <span className="text-xs font-medium text-surface-700 group-hover:text-brand-600 transition-colors">
                    {tag.name}
                  </span>
                </div>
                <span className="text-[11px] text-surface-400 group-hover:text-surface-600">
                  {tag.posts} posts
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Academic Community Honor Code */}
        <div
          onClick={() => setShowHonorModal(true)}
          className="rounded-2xl bg-surface-100/70 border border-surface-200/80 p-3.5 text-[11px] text-surface-500 leading-relaxed space-y-1.5 cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-all group"
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center justify-between font-semibold text-surface-700 group-hover:text-brand-700 transition-colors">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-600" /> Academic Honor Code
            </span>
            <span className="text-[10px] text-brand-600 font-medium underline">Read</span>
          </div>
          <p>
            StudySync promotes ethical peer-to-peer knowledge sharing, study streaks, and genuine learning. No unverified exam solutions.
          </p>
        </div>
      </div>

      <HonorCodeModal
        isOpen={showHonorModal}
        onClose={() => setShowHonorModal(false)}
      />
    </aside>
  );
}

export default RightSidebar;
