const createExpoWebpackConfigAsync = require("@expo/webpack-config");
const path = require("path");
const webpack = require("webpack");

module.exports = async function (env, argv) {
  // Create the default Expo webpack config
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Add polyfill for process
  config.resolve.alias = {
    ...config.resolve.alias,
    process: require.resolve("process/browser"),
  };

  // Add process as a plugin
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: "process/browser",
    })
  );

  return config;
};
