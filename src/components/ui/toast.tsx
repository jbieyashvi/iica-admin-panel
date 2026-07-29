import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';

export type ToastKind = 'success' | 'info' | 'error';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

let toasts: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(message: string, kind: ToastKind = 'success') {
  const id = ++seq;
  toasts = [...toasts, { id, kind, message }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 3800);
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

const icons = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  info: <Info className="h-4 w-4 text-sky-600" />,
  error: <AlertTriangle className="h-4 w-4 text-red-600" />,
};

export function Toaster() {
  const items = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => toasts,
    () => toasts,
  );

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-full max-w-sm flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto flex items-start gap-2.5 rounded-lg border border-cream-200 bg-white px-4 py-3 shadow-drawer"
        >
          <span className="mt-0.5">{icons[t.kind]}</span>
          <p className="flex-1 text-sm text-charcoal">{t.message}</p>
          <button
            onClick={() => dismiss(t.id)}
            className="rounded p-0.5 text-charcoal-muted hover:text-charcoal"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
