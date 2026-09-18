
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: '#00D4B8',
          dark: '#00B8A0',
          light: '#E0FFF9',
          glow: 'rgba(0,212,184,0.15)',
        },
        navy: {
          DEFAULT: '#0D1B2A',
          card: '#112233',
          card2: '#0F1E30',
        },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      boxShadow: {
        teal: '0 0 20px rgba(0,212,184,0.25)',
        'teal-lg': '0 8px 40px rgba(0,212,184,0.3)',
      },
    },
  },
  plugins: [],
}
