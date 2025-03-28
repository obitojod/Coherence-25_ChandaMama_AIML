// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add resolver for .web.tsx files
config.resolver.sourceExts = [
  "jsx",
  "js",
  "ts",
  "tsx",
  "json",
  "web.tsx",
  "web.jsx",
];

// Fix for expo-router context issue
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  process: require.resolve("process/browser"),
};

config.resolver.assetExts.push("cjs");

module.exports = config;
