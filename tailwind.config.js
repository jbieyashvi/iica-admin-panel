/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // IICA magenta — primary accent only
        magenta: {
          50: '#fdf2f8',
          100: '#fce7f1',
          200: '#fbcfe3',
          300: '#f9a8cd',
          400: '#f472ad',
          500: '#C2186B', // primary
          600: '#a8145d',
          700: '#8a1049',
          800: '#6f0e3c',
          900: '#5c0d33',
        },
        charcoal: {
          DEFAULT: '#211E1D',
          light: '#3a3634',
          muted: '#6b6560',
        },
        cream: {
          DEFAULT: '#FAF8F5', // warm off-white app bg
          100: '#F4F1EC',
          200: '#ECE7DF',
        },
      },
      fontFamily: {
        serif: ['"Fraunces"', 'Georgia', 'Cambria', 'serif'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(33,30,29,0.04), 0 1px 3px rgba(33,30,29,0.06)',
        card: '0 1px 3px rgba(33,30,29,0.05), 0 4px 12px rgba(33,30,29,0.04)',
        drawer: '0 10px 40px rgba(33,30,29,0.12)',
      },
      borderRadius: {
        lg: '10px',
        xl: '14px',
      },
    },
  },
  plugins: [],
};
