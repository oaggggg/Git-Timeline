/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        github: {
          dark: {
            bg: '#0d1117',
            surface: '#161b22',
            border: '#30363d',
            hover: '#21262d',
            text: '#e6edf3',
            muted: '#8b949e',
            subtle: '#6e7681'
          }
        }
      }
    },
  },
  plugins: [],
}
