import type { ReactNode } from 'react';

export function PageHeader({ eyebrow, title, meta, actions }: { eyebrow?: string; title: string; meta?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p> : null}
        <h1 className={`${eyebrow ? 'mt-2' : ''} text-2xl font-semibold tracking-tight text-[#101820] sm:text-3xl`}>{title}</h1>
        {meta ? <p className="mt-2 text-sm font-medium text-slate-500">{meta}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function MetricCard({ label, value, compact = false }: { label: string; value: string | number; compact?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white ${compact ? 'p-4' : 'p-5'} shadow-[0_10px_30px_rgba(16,24,32,0.04)]`}>
      <span className="absolute inset-x-0 top-0 h-1 bg-[#B5E61D]" />
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className={`${compact ? 'mt-2 text-xl' : 'mt-3 text-2xl'} font-semibold tracking-tight text-[#101820]`}>{value}</p>
    </div>
  );
}

export function ActionCard({ title, meta, icon, action, children }: { title: string; meta?: string; icon?: ReactNode; action?: ReactNode; children?: ReactNode }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_34px_rgba(16,24,32,0.05)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon ? <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#101820] text-[#B5E61D]">{icon}</div> : null}
          <div>
            <h2 className="text-lg font-semibold text-[#101820]">{title}</h2>
            {meta ? <p className="mt-1 text-sm text-slate-500">{meta}</p> : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
