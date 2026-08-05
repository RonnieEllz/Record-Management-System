/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f4fbff',
          100: '#dff4ff',
          500: '#62c8ff',
          600: '#2ea7e8',
          700: '#1f7cb2',
        },
        surface: {
          DEFAULT: '#07111f',
          2: '#0b1628',
          3: '#12213a',
        },
        ink: {
          DEFAULT: '#f5f9ff',
          muted: '#94a6c2',
        },
      },
    },
  },
  plugins: [],
};
