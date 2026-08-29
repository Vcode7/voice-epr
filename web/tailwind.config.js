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
        background: 'var(--background)',
        card: 'var(--card)',
        cardBorder: 'var(--card-border)',
        surface: 'var(--surface)',
        surfaceMuted: 'var(--surface-muted)',
        primary: 'var(--primary)',
        primaryDark: 'var(--primary-dark)',
        secondary: 'var(--secondary)',
        accent: 'var(--accent)',
        danger: 'var(--danger)',
        dataColor: 'var(--data-color)',
        text: 'var(--text)',
        textMuted: 'var(--text-muted)',
        textSubtle: 'var(--text-subtle)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
