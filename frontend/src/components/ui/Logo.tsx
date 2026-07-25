import { useState, useEffect } from 'react';

// Reusable brand mark used everywhere a logo can appear: the dashboard
// sidebar/topbar (Student, Teacher, School Admin, Platform Admin — see
// layouts/DashboardLayout.tsx), the school-admin branding preview, and the
// public login page. Centralizing it here means "what happens when there is
// no logo, or the logo URL 404s" is answered in exactly one place instead of
// being reimplemented (and forgotten) on every page.
//
// Fallback rules, in order:
//   1. `src` provided and loads successfully -> show the image.
//   2. `src` provided but fails to load (broken upload, deleted file,
//      network hiccup) -> swap to the fallback mark. This is the case a
//      plain <img> can silently get wrong (a broken-image icon) — we catch
//      it via onError and never let that render.
//   3. No `src` at all -> fallback mark immediately, no failed request.
//
// The fallback mark itself never depends on a network asset (no /logo.png
// fetch) so it can never itself be "the broken image" — it's pure CSS/SVG,
// built from `name` (school initials) or a default "AH" wordmark when no
// name is meaningful.
const SIZE_CLASSES = {
  sm: 'h-10 w-10 rounded-xl',
  md: 'h-14 w-14 rounded-2xl',
  lg: 'h-16 w-16 rounded-2xl',
  // Used by the public login page's brand mark — the one place a much
  // larger logo is shown outside a dashboard sidebar/topbar.
  xl: 'h-36 w-36 rounded-[28px]',
} as const;

const TEXT_SIZE_CLASSES = {
  sm: 'text-xs',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-4xl',
} as const;

export type LogoSize = keyof typeof SIZE_CLASSES;

function getInitials(name?: string | null): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed || trimmed.toLowerCase() === 'assignment hub') return 'AH';
  const initials = trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return initials || 'AH';
}

export function Logo({
  src,
  name,
  size = 'md',
  className = '',
}: {
  /** Logo image URL (e.g. school.logoUrl). Falsy/undefined shows the fallback mark. */
  src?: string | null;
  /** School or brand name, used for alt text and the initials fallback. */
  name?: string | null;
  size?: LogoSize;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);

  // Reset the broken flag whenever the source changes (e.g. school branding
  // was just updated) so a previous failure doesn't stick around forever.
  useEffect(() => {
    setBroken(false);
  }, [src]);

  const showImage = !!src && !broken;
  const initials = getInitials(name);

  return (
    <div
      className={`flex ${SIZE_CLASSES[size]} shrink-0 items-center justify-center overflow-hidden bg-white shadow-lg ring-1 ring-black/5 ${className}`}
      aria-hidden={showImage ? undefined : true}
    >
      {showImage ? (
        <img
          src={src as string}
          alt={name ? `${name} logo` : 'School logo'}
          className="h-full w-full object-contain p-1.5"
          loading="lazy"
          onError={() => setBroken(true)}
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-[#101820] to-[#1c2a38] ${TEXT_SIZE_CLASSES[size]} font-bold text-[#B5E61D]`}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
