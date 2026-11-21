const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for .cjs files
if (!config.resolver.sourceExts.includes('cjs')) {
  config.resolver.sourceExts.push('cjs');
}

// Map missing react-native modules to stubs/polyfills
config.resolver.extraNodeModules = {
  'react-native/setup-env': path.resolve(__dirname, 'node_modules/react-native/setup-env.js'),
  'react-native/unstable-internals-do-not-use': path.resolve(__dirname, 'node_modules/react-native/unstable-internals-do-not-use.js'),
  'react-native/asset-registry': path.resolve(__dirname, 'node_modules/react-native/asset-registry.js'),
};

module.exports = config;
