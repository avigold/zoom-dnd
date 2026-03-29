import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'map-bg': '#1a1a2e',
        'map-grid': '#2a2a4a',
        'token-player': '#4a9eff',
        'token-monster': '#ff4a4a',
        'token-dead': '#555566',
        'hp-healthy': '#22c55e',
        'hp-bloodied': '#eab308',
        'hp-critical': '#ef4444',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
