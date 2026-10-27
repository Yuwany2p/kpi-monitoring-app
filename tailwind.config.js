/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        astra: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#1d4ed8', // Astra Blue Primary
          700: '#1e40af', // Astra Blue Deep
          800: '#1247b0', // Politeknik Astra signature blue
          900: '#0b3b95', // Astra Corporate Blue
          navy: '#0f1e36', // Sidebar Dark Navy
        },
        status: {
          green: '#10b981',
          yellow: '#f59e0b',
          red: '#ef4444',
        }
      }
    },
  },
  plugins: [],
}
