import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        outer: '#3b82f6',
        inner: '#10b981',
        bottom: '#f59e0b',
        shoes: '#8b5cf6',
        bag: '#ec4899',
        acc: '#ef4444',
      },
    },
  },
  plugins: [],
}
export default config














