module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  // Reanimated must be last. Sentry uses the Expo plugin in app.config.js + runtime init (no @sentry/react-native/babel in v7).
    plugins: ["react-native-reanimated/plugin"],
  };
};
