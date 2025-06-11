/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'poppins': ['Poppins', 'sans-serif'],
        'integral': ['Integral CF', 'sans-serif'],
      },
      colors: {
        primary: {
          blue: '#174fa2',
          darkblue: '#004aad',
        }
      }
    },
  },
  plugins: [],
} 