const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for .cjs files
if (!config.resolver.sourceExts.includes('cjs')) {
  config.resolver.sourceExts.push('cjs');
}

// CRITICAL: Completely exclude the functions folder from bundling
// The functions/ folder contains Cloud Functions (Node.js only)
const functionsPath = path.resolve(__dirname, 'functions');

// Initialize blockList if it doesn't exist
if (!config.resolver.blockList) {
  config.resolver.blockList = [];
}

// Add blocking rules to prevent Node.js modules from being bundled
config.resolver.blockList.push(
  // Block entire functions directory
  new RegExp(`${functionsPath.replace(/\\/g, '\\\\')}(?:[/\\\\]|$)`),
  // Block firebase-functions package
  /firebase-functions/,
  // Block Node.js built-in modules
  /^(async_hooks|util|path|fs|stream|events|buffer|crypto|http|https|net|os|process|url|querystring|zlib)$/,
);

// Remove functions from watchFolders to prevent unnecessary rebuilds
if (config.watchFolders && Array.isArray(config.watchFolders)) {
  config.watchFolders = config.watchFolders.filter(f => !f.includes('functions'));
}

module.exports = config;
