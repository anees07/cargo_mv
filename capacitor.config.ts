import type { CapacitorConfig } from '@capacitor/cli';

const remoteServerUrl = process.env.CAPACITOR_SERVER_URL ?? 'https://cargomv-d41f8.web.app';

const config: CapacitorConfig = {
  appId: 'com.maldives.cargo',
  appName: 'Maldives Cargo',
  webDir: 'dist',
  server: {
    url: remoteServerUrl,
    cleartext: false,
  },
};

export default config;
