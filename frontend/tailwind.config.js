/** @type {import('tailwindcss').Config} */
function withOpacity(variable) {
  return ({ opacityValue }) => {
    if (opacityValue === undefined) {
      return `rgb(var(${variable}))`;
    }
    return `rgba(var(${variable}), ${opacityValue})`;
  };
}

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
          DEFAULT: withOpacity('--surface-rgb'),
          2: withOpacity('--surface-2-rgb'),
          3: withOpacity('--surface-3-rgb'),
        },
        ink: {
          DEFAULT: withOpacity('--text-rgb'),
          muted: withOpacity('--text-muted-rgb'),
        },
        accent: {
          DEFAULT: withOpacity('--accent-rgb'),
          strong: withOpacity('--accent-strong-rgb'),
        },
      },
    },
  },
  plugins: [],
};
