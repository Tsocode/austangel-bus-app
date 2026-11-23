import 'dotenv/config';

export default ({ config }) => {
  const legacyMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const androidMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY || legacyMapsKey;
  const iosMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY || legacyMapsKey;
  const webMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY;

  return {
    ...config,
    name: 'austangel',
    slug: 'austangel',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'austangel',
    userInterfaceStyle: 'automatic',
    newArchEnabled: false,
    ios: {
      bundleIdentifier: 'com.tsocode.austangel',
      supportsTablet: true,
    },
    android: {
      package: 'com.tsocode.austangel',
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      ['@stripe/stripe-react-native', {}],
      ...(androidMapsKey || iosMapsKey
        ? [['react-native-maps', {
            ...(androidMapsKey ? { androidGoogleMapsApiKey: androidMapsKey } : {}),
            ...(iosMapsKey ? { iosGoogleMapsApiKey: iosMapsKey } : {}),
          }]]
        : []),
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      ...config.extra,
      eas: {
        projectId: '3778bb84-a6a0-4df5-945e-bbd566ff5134',
      },
      expoPublicFirebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      expoPublicFirebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      expoPublicFirebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      expoPublicFirebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      expoPublicFirebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      expoPublicFirebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      expoPublicGoogleMapsAndroidApiKey: androidMapsKey,
      expoPublicGoogleMapsIosApiKey: iosMapsKey,
      expoPublicGoogleMapsWebApiKey: webMapsKey,
    },
  };
};
