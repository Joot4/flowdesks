/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefcfe',
          100: '#d8f7fb',
          200: '#b6edf6',
          300: '#83e0ef',
          400: '#47c8dd',
          500: '#23acc6',
          600: '#1889a4',
          700: '#176e84',
          800: '#17596b',
          900: '#184a58'
        }
      },
      boxShadow: {
        soft: '0 12px 30px -16px rgba(15, 23, 42, 0.35)'
      }
    }
  },
  plugins: []
};
