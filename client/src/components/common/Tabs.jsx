import React from 'react';
import { cn } from '@/utils/cn';

/**
 * Reusable StudySync Tabs component
 */
export function Tabs({
  tabs = [],
  activeTab,
  onChange,
  variant = 'pills', // 'pills' | 'line'
  className,
}) {
  return (
    <div
      className={cn(
        variant === 'line'
          ? 'flex border-b border-surface-200 gap-6'
          : 'flex p-1 bg-surface-100 rounded-xl gap-1',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        if (variant === 'line') {
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2',
                isActive
                  ? 'border-brand-600 text-brand-600 font-semibold'
                  : 'border-transparent text-surface-500 hover:text-surface-800'
              )}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'text-[11px] px-1.5 py-0.5 rounded-full',
                    isActive ? 'bg-brand-50 text-brand-700' : 'bg-surface-200 text-surface-600'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium transition-all duration-150',
              isActive
                ? 'bg-white text-surface-900 shadow-subtle font-semibold'
                : 'text-surface-600 hover:text-surface-900 hover:bg-white/50'
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-200/80 text-surface-600">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
