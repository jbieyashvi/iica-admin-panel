import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className={cn('card relative my-8 w-full shadow-drawer', sizes[size])}>
        <header className="flex items-start justify-between gap-4 border-b border-cream-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-charcoal">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-charcoal-muted">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-charcoal-muted hover:bg-cream-100 hover:text-charcoal"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-cream-200 px-5 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
