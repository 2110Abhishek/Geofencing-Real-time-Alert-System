/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          primary: '#0B1220',
          secondary: '#111C2E',
          card: '#16243C',
          border: '#1E293B',
        },
        accent: {
          blue: '#3B82F6',
          cyan: '#06B6D4',
        },
        status: {
          success: '#22C55E',
          warning: '#F59E0B',
          critical: '#EF4444',
          info: '#3B82F6',
        }
      }
    },
  },
  plugins: [],
}

