/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Ma'amAI Editorial Executive Workspace Palette
        cobalt: {
          DEFAULT: '#3157E8',
          hover: '#2444C7',
          light: '#EEF2FF',
          border: '#D0DBFA',
        },
        ink: {
          DEFAULT: '#111111',
          primary: '#111111',
          secondary: '#626875',
          muted: '#9CA3AF',
        },
        surface: {
          canvas: '#F7F8FA',
          card: '#FFFFFF',
          border: '#E5E7EB',
          subtle: '#F1F3F5',
        },
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#6085FA',
          500: '#3157E8',
          600: '#3157E8',
          700: '#2444C7',
          800: '#1D35A3',
          900: '#16277D',
          950: '#0F1A52',
        },
        success: {
          DEFAULT: '#16803D',
          light: '#F0FDF4',
          border: '#BBF7D0',
        },
        warning: {
          DEFAULT: '#B45309',
          light: '#FFFBEB',
          border: '#FDE68A',
        },
        danger: {
          DEFAULT: '#B91C1C',
          light: '#FEF2F2',
          border: '#FECACA',
        },
      },
      fontFamily: {
        sans: [
          'Geist',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        hover: '0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}
