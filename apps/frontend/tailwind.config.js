export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#D6E8F7',
          100: '#A8C5E8',
          200: '#7BA8D9',
          300: '#4E8BCA',
          400: '#2E6DA4',
          500: '#1A5080',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
