import React from 'react';
import { Hash, ArrowRight, FileText } from 'lucide-react';
import Badge from '@/components/common/Badge';

export function TagSearchCard({ tag, onSelect, className = '' }) {
  if (!tag) return null;

  return (
    <div
      onClick={() => onSelect?.(tag.tag)}
      className={`p-4 rounded-2xl bg-white border border-surface-200/90 shadow-card hover:shadow-modal hover:border-brand-300 transition-all duration-200 cursor-pointer flex flex-col justify-between group ${className}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(tag.tag);
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 group-hover:scale-105 transition-transform shrink-0">
            <Hash className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-surface-900 group-hover:text-brand-600 transition-colors truncate">
              #{tag.tag}
            </h3>
            <span className="text-[11px] text-surface-500 flex items-center gap-1 mt-0.5">
              <FileText className="w-3 h-3 text-surface-400" />
              <span>{tag.postCount} {tag.postCount === 1 ? 'study post' : 'study posts'}</span>
            </span>
          </div>
        </div>

        <Badge variant="neutral" size="sm" className="shrink-0">
          Topic
        </Badge>
      </div>

      <div className="pt-3 mt-3 border-t border-surface-100 flex items-center justify-between text-xs">
        <span className="text-[11px] text-surface-400">Click to filter posts</span>
        <span className="inline-flex items-center gap-1 font-semibold text-brand-600 group-hover:text-brand-700">
          <span>Explore</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </div>
  );
}

export default TagSearchCard;
