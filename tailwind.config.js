/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        bg: '#0f1117',
        surface: '#1a1d27',
        border: '#2a2d3a',
        accent: '#f0c040',
        'accent-dim': '#a08020',
        muted: '#6b7280',
        success: '#34d399',
        danger: '#f87171',
        info: '#60a5fa',
      }
    },
  },
  plugins: [],
}
