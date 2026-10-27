/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Biru Politeknik Astra (NFR Cultural & Political)
        astra: {
          50: '#EEF3FD',
          100: '#DCE6FB',
          200: '#B9CCF6',
          300: '#8AA9EE',
          400: '#5580E3',
          500: '#2F62DD',
          600: '#1D4ED8',
          700: '#1A43B8',
          800: '#173A9C',
          900: '#13295C',
          navy: '#13295C',
        },
        canvas: '#F3F6FB',
      },
    },
  },
  plugins: [],
};
