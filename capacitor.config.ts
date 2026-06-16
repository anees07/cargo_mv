import type { CapacitorConfig } from '@capacitor/cli';

const remoteServerUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.maldives.cargo',
  appName: 'Maldives Cargo',
  webDir: 'dist',
  ...(remoteServerUrl
    ? {
        server: {
          url: remoteServerUrl,
          cleartext: remoteServerUrl.startsWith('http://'),
        },
      }
    : {}),
};

export default config;
