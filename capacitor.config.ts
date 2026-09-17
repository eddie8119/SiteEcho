import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.SiteNear.fieldalbum',
  appName: 'SiteNear',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    buildOptions: {
      keystorePath: process.env.KEYSTORE_PATH || '',
      keystoreAlias: process.env.KEYSTORE_ALIAS || '',
      keystoreAliasPassword: process.env.KEYSTORE_PASSWORD || '',
      keystorePassword: process.env.KEYSTORE_PASSWORD || '',
    },
  },
  ios: {
    contentInset: 'never',
    scrollEnabled: false,
    scheme: 'SiteNear',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#eafe62',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      iosSplashResourceName: 'splash',
      iosSplashStyle: 'default',
      androidSpinnerStyle: 'large',
      spinnerColor: '#ffffff',
    },
    StatusBar: {
      style: 'DARK',
    },
    App: {
      launchUrl: '/mobile/timeline',
    },
    Keyboard: {
      resize: 'native',
    },
    Browser: {},
    AppleStoreKitPlugin: {},
    GooglePlayBilling: {},
  },
  packageClassList: [
    'CameraPreview',
    'AppPlugin',
    'CAPBrowserPlugin',
    'CAPCameraPlugin',
    'DevicePlugin',
    'GooglePlayBilling',
    'PreferencesPlugin',
    'SplashScreenPlugin',
    'StatusBarPlugin',
    'AppleStoreKitPlugin',
  ],
};

export default config;
