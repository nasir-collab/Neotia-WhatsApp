/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        anhvl: {
          navy: '#0f2942',
          teal: '#0d7490',
          emerald: '#059669',
          sand: '#f8fafc',
        },
      },
    },
  },
  plugins: [],
};

