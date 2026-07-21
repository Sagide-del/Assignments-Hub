import type { School } from '../types';

export const SCHOOL_THEME_TEMPLATES = {
  ACADEMIC_NAVY: {
    label: 'Academic Navy',
    primary: '#101820',
    accent: '#B5E61D',
    background: '#F8FAFC',
  },
  ROYAL_BLUE: {
    label: 'Royal Blue',
    primary: '#003B73',
    accent: '#FFD700',
    background: '#F7F9FC',
  },
  MODERN_TEAL: {
    label: 'Modern Teal',
    primary: '#006D77',
    accent: '#83C5BE',
    background: '#EDF6F9',
  },
  EMERALD_EDUCATION: {
    label: 'Emerald Education',
    primary: '#064E3B',
    accent: '#10B981',
    background: '#F0FDF4',
  },
  MAROON_PROFESSIONAL: {
    label: 'Maroon Professional',
    primary: '#6B1E3F',
    accent: '#D4AF37',
    background: '#FFF8F0',
  },
} satisfies Record<
  NonNullable<School['themeTemplate']>,
  { label: string; primary: string; accent: string; background: string }
>;

export type SchoolThemeTemplate = keyof typeof SCHOOL_THEME_TEMPLATES;

export function resolveSchoolTheme(template?: School['themeTemplate'] | null) {
  return SCHOOL_THEME_TEMPLATES[template ?? 'ACADEMIC_NAVY'];
}

export function applySchoolTheme(school: Pick<School, 'themeTemplate'> | null) {
  const theme = resolveSchoolTheme(school?.themeTemplate);
  const root = document.documentElement;

  root.style.setProperty('--school-primary', theme.primary);
  root.style.setProperty('--school-accent', theme.accent);
  root.style.setProperty('--school-background', theme.background);
}
