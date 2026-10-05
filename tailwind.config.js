import animate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        // Laptop screens with little vertical room — the admin sidebar
        // tightens up so the whole menu fits without scrolling.
        short: { raw: '(max-height: 1000px)' },
        // Very short screens: drop the group dividers too.
        tiny: { raw: '(max-height: 760px)' },
      },
    },
  },
  plugins: [animate],
}
