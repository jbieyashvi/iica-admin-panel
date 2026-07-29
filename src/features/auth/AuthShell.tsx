import type { ReactNode } from 'react';
import { LogoMark } from '../../components/brand/Logo';

// Two-column auth layout: brand panel on the left, form card on the right.
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-cream">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-charcoal px-12 py-10 lg:flex">
        <div className="flex items-center gap-3">
          <LogoMark className="h-10 w-10" />
          <div className="leading-tight">
            <div className="font-serif text-lg font-semibold text-white">IICA</div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-white/60">
              Admin Panel
            </div>
          </div>
        </div>

        <div className="max-w-md">
          <h2 className="font-serif text-3xl font-medium leading-snug text-white">
            The operational control room for the IICA platform.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Manage memberships, portfolios, commerce and community — all from one calm,
            considered workspace built for the IICA team.
          </p>
        </div>

        <p className="text-xs text-white/40">© 2026 IICA · Internal administration console</p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoMark className="h-10 w-10" />
            <div className="leading-tight">
              <div className="font-serif text-lg font-semibold text-charcoal">IICA</div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-charcoal-muted">
                Admin Panel
              </div>
            </div>
          </div>

          <h1 className="font-serif text-2xl font-medium text-charcoal">{title}</h1>
          {subtitle && <p className="mb-6 mt-1.5 text-sm text-charcoal-muted">{subtitle}</p>}
          <div className={subtitle ? '' : 'mt-6'}>{children}</div>
        </div>
      </div>
    </div>
  );
}
