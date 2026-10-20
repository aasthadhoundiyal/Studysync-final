import React from 'react';
import { cn } from '@/utils/cn';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

/**
 * Reusable StudySync Alert banner component
 */
export function Alert({
  variant = 'info',
  title,
  children,
  onClose,
  className,
  ...props
}) {
  const icons = {
    info: <Info className="w-5 h-5 text-brand-600 shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
  };

  const variants = {
    info: 'bg-brand-50/70 text-brand-900 border-brand-200/80',
    success: 'bg-emerald-50/70 text-emerald-900 border-emerald-200/80',
    warning: 'bg-amber-50/70 text-amber-900 border-amber-200/80',
    error: 'bg-rose-50/70 text-rose-900 border-rose-200/80',
  };

  return (
    <div
      role="alert"
      className={cn(
        'rounded-xl border p-4 flex gap-3 text-sm transition-all',
        variants[variant] || variants.info,
        className
      )}
      {...props}
    >
      {icons[variant] || icons.info}
      <div className="flex-1 min-w-0">
        {title && <h5 className="font-semibold leading-tight mb-1">{title}</h5>}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          aria-label="Close alert"
          className="shrink-0 text-surface-400 hover:text-surface-700 p-0.5 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default Alert;
