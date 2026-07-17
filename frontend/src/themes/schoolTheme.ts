// The School model has no brandColor column (see backend/prisma/schema.prisma
// and ROADMAP.md's gap table) — only logoUrl. This function is kept as the
// single place per-school theming would plug in once that field exists;
// today it's a no-op that always clears back to the platform default, so
// nothing here silently reads a field the backend doesn't send.
export function applySchoolTheme(_school: unknown) {
  document.documentElement.style.removeProperty('--brand-color');
}
