import React from 'react';
import { cn } from '@/utils/cn';

/**
 * Reusable StudySync Card components
 */
export function Card({ className, interactive = false, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white border border-surface-200/90 shadow-card overflow-hidden',
        interactive &&
          'transition-all duration-150 hover:border-surface-300 hover:shadow-card-hover cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('px-6 py-5 border-b border-surface-100/80', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, as: Component = 'h3', ...props }) {
  return (
    <Component
      className={cn('text-base font-semibold text-surface-900 tracking-tight', className)}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn('text-xs text-surface-500 mt-1 leading-relaxed', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'px-6 py-4 bg-surface-50/60 border-t border-surface-100 flex items-center justify-between',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
