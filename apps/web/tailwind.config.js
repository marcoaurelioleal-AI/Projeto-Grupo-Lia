/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lia: {
          red: '#CC2936',
          burgundy: '#4B0714',
          wine: '#6E1423',
          cream: '#FBF6E9',
          beige: '#F4E7D2',
          ink: '#251514',
          muted: '#7A5A52',
          green: '#317057',
          amber: '#B66A18'
        }
      },
      boxShadow: {
        soft: '0 10px 30px rgba(75, 7, 20, 0.12)'
      }
    }
  },
  plugins: []
};
