/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Platform default brand colors — overridden per-school at runtime
        // via CSS custom properties set in src/themes/schoolTheme.ts, not
        // by editing this file. See DashboardLayout for how a school's
        // saved brand color gets applied.
        brand: {
          DEFAULT: 'var(--brand-color, #1D4ED8)',
          light: 'var(--brand-color-light, #3B82F6)',
        },
      },
    },
  },
  plugins: [],
};
