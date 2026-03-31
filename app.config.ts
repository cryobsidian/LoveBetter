import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const baseUrl = process.env.EXPO_BASE_URL ?? "";

  return {
    ...config,
    name: "Love Better",
    slug: "love-better",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
    },
    android: {
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      bundler: "metro",
    },
    experiments: {
      baseUrl,
    },
  };
};
