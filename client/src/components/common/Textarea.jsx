import React from 'react';
import { cn } from '@/utils/cn';

/**
 * Reusable StudySync Textarea component
 */
export const Textarea = React.forwardRef(
  (
    {
      label,
      error,
      helperText,
      maxLength,
      value,
      className,
      containerClassName,
      id,
      rows = 4,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const charCount = typeof value === 'string' ? value.length : 0;

    return (
      <div className={cn('w-full flex flex-col gap-1.5', containerClassName)}>
        <div className="flex items-center justify-between">
          {label && (
            <label
              htmlFor={textareaId}
              className="text-xs font-semibold text-surface-700 tracking-wide uppercase"
            >
              {label}
            </label>
          )}
          {maxLength && (
            <span className="text-[11px] text-surface-400">
              {charCount} / {maxLength}
            </span>
          )}
        </div>
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          value={value}
          maxLength={maxLength}
          disabled={disabled}
          className={cn(
            'w-full rounded-xl bg-white text-surface-900 border border-surface-200 p-3 text-sm transition-all duration-150 resize-y',
            'placeholder:text-surface-400',
            'focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
            'disabled:bg-surface-50 disabled:text-surface-400 disabled:cursor-not-allowed',
            error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs font-medium text-rose-600 mt-0.5">{error}</p>}
        {!error && helperText && (
          <p className="text-xs text-surface-500 mt-0.5">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export default Textarea;
