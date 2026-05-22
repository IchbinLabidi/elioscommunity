/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        elios: {
          navy: '#071a3d',
          blue: '#123a6f',
          sky: '#eaf3ff',
          yellow: '#f6c945',
          ink: '#12213b',
        },
      },
      boxShadow: {
        soft: '0 18px 45px rgba(7, 26, 61, 0.10)',
      },
    },
  },
  plugins: [],
};
