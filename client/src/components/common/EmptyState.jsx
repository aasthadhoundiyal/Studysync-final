import React from 'react';
import { cn } from '@/utils/cn';
import Button from './Button';

/**
 * Reusable StudySync Empty State component
 */
export function EmptyState({
  icon = null,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-surface-200 bg-surface-50/50 p-8 text-center flex flex-col items-center justify-center min-h-[220px]',
        className
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-white border border-surface-200 flex items-center justify-center text-surface-400 mb-4 shadow-subtle">
          {icon}
        </div>
      )}
      <h4 className="text-base font-semibold text-surface-800">{title}</h4>
      {description && (
        <p className="text-xs text-surface-500 max-w-sm mt-1.5 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export default EmptyState;
