import React from 'react';
import { cn } from '@/utils/cn';

/**
 * Reusable StudySync Badge component
 */
export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className,
  ...props
}) {
  const variants = {
    brand: 'bg-brand-50 text-brand-700 border-brand-200/70',
    primary: 'bg-indigo-50 text-indigo-700 border-indigo-200/70',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/70',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/70',
    neutral: 'bg-surface-100 text-surface-700 border-surface-200/70',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/70',
    sky: 'bg-sky-50 text-sky-700 border-sky-200/70',
  };

  const dotColors = {
    brand: 'bg-brand-600',
    primary: 'bg-indigo-600',
    success: 'bg-emerald-600',
    warning: 'bg-amber-600',
    danger: 'bg-rose-600',
    neutral: 'bg-surface-500',
    purple: 'bg-purple-600',
    sky: 'bg-sky-600',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 rounded-md font-medium',
    md: 'text-xs px-2.5 py-1 rounded-lg font-medium',
    lg: 'text-sm px-3 py-1.5 rounded-lg font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border leading-none shrink-0 tracking-tight select-none',
        variants[variant] || variants.neutral,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant] || dotColors.neutral)}
        />
      )}
      {children}
    </span>
  );
}

export default Badge;
