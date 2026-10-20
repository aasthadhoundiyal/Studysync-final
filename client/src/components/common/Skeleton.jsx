import React from 'react';
import { cn } from '@/utils/cn';

/**
 * Reusable StudySync Skeleton placeholder component
 */
export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-surface-200/75', className)}
      {...props}
    />
  );
}

/**
 * Pre-configured Post skeleton loader
 */
export function PostSkeleton() {
  return (
    <div className="rounded-2xl bg-white border border-surface-200/90 p-5 shadow-card space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-5 w-3/4" />
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-5/6" />
      </div>
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-6 w-16 rounded-md" />
        <Skeleton className="h-6 w-20 rounded-md" />
      </div>
    </div>
  );
}

export default Skeleton;
