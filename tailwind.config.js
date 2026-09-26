/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // The brand palette — the same values as the customer and driver apps
      // (tabbaha-app lib/core/constants/app_colors.dart). Use these names,
      // never raw hex, so every screen stays consistent.
      colors: {
        brand: { DEFAULT: '#6B1010', light: '#A52020', dark: '#520C0C' },
        gold: { DEFAULT: '#C8860A', light: '#E8A020', soft: '#F4C752' },
        ivory: '#FDF6E3',
        papyrus: '#F5ECD7',
        line: '#E8DFC9',
        umber: '#6B4C3B',
      },
    },
  },
  plugins: [],
}
