/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        page: '#F5F5F5',
        ink: '#0b0b10',
        plum: '#2B2644',
        night: '#13111f',
        violet: '#7c4dff',
        pink: '#ff2d8f',
        youtube: '#ff0033',
        twitch: '#9146ff',
        kick: '#53fc18',
        tiktok: '#fe2c55',
        facebook: '#0866ff',
      },
    },
  },
  plugins: [],
};
