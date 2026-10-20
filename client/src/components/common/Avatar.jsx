import React from 'react';
import { cn } from '@/utils/cn';
import { getMediaUrl } from '@/utils/formatters';

/**
 * Reusable StudySync Avatar component
 */
export function Avatar({
  src,
  alt = 'User avatar',
  name = '',
  size = 'md',
  status = null, // 'online' | 'busy' | 'offline'
  className,
  ...props
}) {
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [src]);

  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base font-semibold',
    xl: 'w-16 h-16 text-xl font-bold',
    '2xl': 'w-20 h-20 text-2xl font-bold',
  };

  const statusSizes = {
    xs: 'w-1.5 h-1.5 ring-1',
    sm: 'w-2 h-2 ring-1.5',
    md: 'w-2.5 h-2.5 ring-2',
    lg: 'w-3 h-3 ring-2',
    xl: 'w-3.5 h-3.5 ring-2',
    '2xl': 'w-4 h-4 ring-2',
  };

  const statusColors = {
    online: 'bg-emerald-500',
    busy: 'bg-amber-500',
    offline: 'bg-surface-400',
  };

  // Derive initials from name (up to 2 characters)
  const getInitials = (text) => {
    if (!text) return 'S';
    const parts = text.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return text.substring(0, 2).toUpperCase();
  };

  const fullImageUrl = src ? getMediaUrl(src) : null;
  const showFallback = !fullImageUrl || imageError;

  return (
    <div className={cn('relative inline-flex shrink-0 select-none rounded-full', className)} {...props}>
      <div
        className={cn(
          'rounded-full overflow-hidden flex items-center justify-center font-medium ring-1 ring-surface-200/80',
          sizes[size] || sizes.md,
          showFallback && 'bg-gradient-to-br from-brand-600 to-indigo-700 text-white shadow-subtle'
        )}
      >
        {!showFallback ? (
          <img
            src={fullImageUrl}
            alt={alt || name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-white',
            statusSizes[size] || statusSizes.md,
            statusColors[status] || statusColors.offline
          )}
        />
      )}
    </div>
  );
}

export default Avatar;
