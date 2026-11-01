import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.angelqq99.cherta',
  appName: 'ЧЕРТА',
  webDir: 'dist',
  backgroundColor: '#f4f1e8',
  plugins: {
    SystemBars: {
      insetsHandling: 'native',
      style: 'DARK',
    },
  },
};

export default config;
