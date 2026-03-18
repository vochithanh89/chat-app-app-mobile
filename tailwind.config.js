/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        zalo: '#0068FF',
        'zalo-light': '#E3F2FD',
        'zalo-green': '#00A859',
        'zalo-dark': '#0052CC',
      },
    },
  },
  plugins: [],
};
