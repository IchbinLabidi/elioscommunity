/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#082B66',
          primaryDark: '#061B3D',
          accent: '#FF8A00',
          accentHover: '#F07800',
          background: '#F7FAFC',
          surface: '#FFFFFF',
          border: '#DCE5F0',
          mutedText: '#526176',
          navy: '#082B66',
          navyDark: '#061B3D',
          orange: '#FF8A00',
          orangeHover: '#F07800',
        },
        // Legacy class aliases keep existing surfaces stable during the sosprof.tn rebrand.
        elios: {
          navy: '#082B66',
          blue: '#0A2E73',
          sky: '#eaf3ff',
          yellow: '#FF8A00',
          ink: '#061B3D',
        },
      },
      boxShadow: {
        soft: '0 18px 45px rgba(7, 26, 61, 0.10)',
      },
    },
  },
  plugins: [],
};
