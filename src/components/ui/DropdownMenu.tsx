import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { useClickOutside } from '../../lib/useClickOutside';
import { Tooltip } from './Tooltip';
import { cn } from '../../lib/cn';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  disabledHint?: string;
  divider?: boolean;
}

export function DropdownMenu({ items, label = 'Row actions' }: { items: MenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-1.5 text-charcoal-muted hover:bg-cream-100 hover:text-charcoal"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-lg border border-cream-200 bg-white py-1 shadow-drawer"
        >
          {items.map((item, i) => {
            if (item.divider) return <div key={`d${i}`} className="my-1 border-t border-cream-200" />;
            const btn = (
              <button
                key={item.label}
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  if (item.disabled) return;
                  setOpen(false);
                  item.onClick?.();
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                  item.disabled
                    ? 'cursor-not-allowed text-charcoal-muted/50'
                    : item.danger
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-charcoal hover:bg-cream-100',
                )}
              >
                {item.icon}
                {item.label}
              </button>
            );
            return item.disabled && item.disabledHint ? (
              <Tooltip key={item.label} label={item.disabledHint} side="bottom">
                {btn}
              </Tooltip>
            ) : (
              btn
            );
          })}
        </div>
      )}
    </div>
  );
}
