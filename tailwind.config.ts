import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#f7f3ec',
        sand: '#efe8dc',
        ink: '#2b2622',
        muted: '#8b8178',
        clay: {
          DEFAULT: '#b06a4e',
          dark: '#94563d',
        },
        sage: '#7e8b6f',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
        serif: ['"Noto Serif SC"', '"Songti SC"', 'STSong', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 20px 45px -25px rgba(43, 38, 34, 0.35)',
        card: '0 10px 26px -20px rgba(43, 38, 34, 0.55)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}

export default config
