/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#071E41',
          primaryDark: '#061733',
          accent: '#F6C445',
          accentHover: '#EAB832',
          background: '#F7FAFC',
          surface: '#FFFFFF',
          border: '#DCE5F0',
          mutedText: '#526176',
        },
        elios: {
          navy: '#071E41',
          blue: '#123a6f',
          sky: '#eaf3ff',
          yellow: '#F6C445',
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
