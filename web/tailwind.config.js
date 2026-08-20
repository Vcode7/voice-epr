/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0F172A',
        card: '#1E293B',
        cardBorder: '#334155',
        primary: '#6366F1',
        primaryDark: '#4F46E5',
        secondary: '#10B981',
        accent: '#F59E0B',
        danger: '#EF4444',
        dataColor: '#06B6D4',
        textMuted: '#94A3B8',
        textSubtle: '#64748B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
