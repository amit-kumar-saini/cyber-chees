import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cyber.chess',
  appName: 'cyber-chess',
  webDir: 'dist',
  plugins: {
    AdMob: {
      appId: 'ca-app-pub-3940256099942544~3347511713',
      initializeForTesting: true
    }
  }
};

export default config;