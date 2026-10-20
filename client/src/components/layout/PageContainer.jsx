import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/utils/cn';
import Skeleton from '@/components/common/Skeleton';

const maxWidthMap = {
  narrow: 'max-w-2xl',
  default: 'max-w-4xl',
  wide: 'max-w-6xl',
  full: 'w-full',
};

/**
 * Reusable StudySync PageContainer component.
 * Provides consistent layout wrapper, header hierarchy, breadcrumbs/back link,
 * actions row, and optional loading skeletons.
 */
export function PageContainer({
  title,
  subtitle,
  badge,
  actions,
  backTo,
  backLabel = 'Back',
  maxWidth = 'default',
  isLoading = false,
  emptyState = null,
  className,
  children,
}) {
  const containerMaxWidth = maxWidthMap[maxWidth] || maxWidthMap.default;

  return (
    <div className={cn('w-full mx-auto space-y-6', containerMaxWidth, className)}>
      {/* Optional Back Navigation */}
      {backTo && (
        <div>
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-surface-500 hover:text-brand-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{backLabel}</span>
          </Link>
        </div>
      )}

      {/* Optional Page Header */}
      {(title || subtitle || actions || badge) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              {title && (
                <h1 className="text-xl sm:text-2xl font-bold text-surface-900 tracking-tight">
                  {title}
                </h1>
              )}
              {badge && <div className="shrink-0">{badge}</div>}
            </div>
            {subtitle && (
              <p className="text-xs text-surface-500 leading-relaxed max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Loading Skeleton Placeholder State */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <div className="space-y-3">
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
          </div>
        </div>
      ) : emptyState ? (
        emptyState
      ) : (
        children
      )}
    </div>
  );
}

export default PageContainer;
