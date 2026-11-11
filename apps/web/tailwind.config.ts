import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#0f2f4f',
          foreground: '#ffffff',
        },
        action: {
          DEFAULT: '#159947',
          foreground: '#ffffff',
        },
      },
      boxShadow: {
        soft: '0 12px 30px rgba(15, 47, 79, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
