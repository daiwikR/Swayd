/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        dark: {
          900: '#0A0A0A',
          800: '#111111',
          700: '#1A1A1A',
          600: '#222222',
          500: '#2A2A2A',
          400: '#333333',
        },
        accent: {
          fitness: '#39FF14',
          music: '#FF2D78',
          tech: '#00D4FF',
          food: '#FF9F1C',
          art: '#C77DFF',
          nightlife: '#FF6B35',
          sports: '#06D6A0',
          wellness: '#FFD166',
          comedy: '#EF476F',
          networking: '#118AB2',
          other: '#8D99AE',
        }
      },
    },
  },
  plugins: [],
}
