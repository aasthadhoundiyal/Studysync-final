import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';

/**
 * Reusable StudySync Dropdown menu component
 */
export function Dropdown({ trigger, items = [], align = 'right', className }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div onClick={() => setIsOpen((prev) => !prev)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-2 w-52 rounded-xl bg-white shadow-modal border border-surface-200/90 py-1.5 focus:outline-none animate-in fade-in-50 zoom-in-95 duration-100',
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
        >
          {items.map((item, idx) => {
            if (item.type === 'divider') {
              return <div key={`div-${idx}`} className="my-1 border-t border-surface-100" />;
            }

            return (
              <button
                key={item.label || idx}
                type="button"
                onClick={() => {
                  item.onClick?.();
                  setIsOpen(false);
                }}
                disabled={item.disabled}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left transition-colors',
                  item.danger
                    ? 'text-rose-600 hover:bg-rose-50'
                    : 'text-surface-700 hover:bg-surface-100/80 hover:text-surface-900',
                  item.disabled && 'opacity-40 cursor-not-allowed'
                )}
              >
                {item.icon && <span className="shrink-0 text-current">{item.icon}</span>}
                <span className="font-medium flex-1">{item.label}</span>
                {item.badge && <span className="shrink-0">{item.badge}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Dropdown;
