import React from 'react';
import { cn } from '@/utils/cn';
import Spinner from './Spinner';

/**
 * Reusable StudySync Button component
 */
export const Button = React.forwardRef(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loading = false,
      disabled = false,
      leftIcon = null,
      rightIcon = null,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isSpinnerLoading = isLoading || loading;
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const variants = {
      primary:
        'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 focus:ring-brand-500 shadow-sm shadow-brand-600/20',
      secondary:
        'bg-surface-100 text-surface-800 hover:bg-surface-200 active:bg-surface-300 focus:ring-surface-400 border border-surface-200',
      outline:
        'bg-white text-surface-700 hover:bg-surface-50 active:bg-surface-100 border border-surface-200 hover:border-surface-300 focus:ring-brand-500 shadow-subtle',
      ghost:
        'bg-transparent text-surface-600 hover:text-surface-900 hover:bg-surface-100 active:bg-surface-200 focus:ring-surface-300',
      danger:
        'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus:ring-rose-500 shadow-sm shadow-rose-600/20',
      success:
        'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus:ring-emerald-500 shadow-sm shadow-emerald-600/20',
      subtleBrand:
        'bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-200 focus:ring-brand-400 border border-brand-200/60',
    };

    const sizes = {
      sm: 'text-xs px-2.5 py-1.5 gap-1.5 rounded-lg',
      md: 'text-sm px-4 py-2 gap-2 rounded-xl',
      lg: 'text-base px-5 py-2.5 gap-2.5 rounded-xl',
      icon: 'p-2 rounded-xl',
      iconSm: 'p-1.5 rounded-lg',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isSpinnerLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isSpinnerLoading ? (
          <>
            <Spinner size="sm" className="text-current" />
            {size !== 'icon' && size !== 'iconSm' && <span>Loading...</span>}
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
