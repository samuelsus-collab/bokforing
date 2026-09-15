/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eaf4ef',
          100: '#d5e8df',
          500: '#2d6a4f',
          600: '#245741',
          700: '#1b4332',
        },
        surface: {
          border: '#e5e7eb',
        },
        sidebar: {
          bg: '#1b4332',
          hover: '#245741',
          active: '#2d6a4f',
        },
      },
    },
  },
  plugins: [],
}
