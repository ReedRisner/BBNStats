import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'uk-blue': '#0033A0',
        'uk-blue-light': '#1A4FBB',
        'uk-blue-dark': '#002878',
        'uk-white': '#FFFFFF',
        'uk-chrome': '#C8C9C7',
        'uk-chrome-light': '#E8E8E7',
        win: '#22c55e',
        loss: '#ef4444'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
};

export default config;
