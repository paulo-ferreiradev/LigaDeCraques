const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// WHY: Registers the custom Vercel asset plugin to rewrite 'node_modules' paths to 'vendor_modules'
// in static builds, avoiding 404 font asset load errors on Vercel deployments.
config.transformer.assetPlugins = [
  path.resolve(__dirname, 'vercel-asset-plugin.js'),
];

// WHY: Ensure font files are explicitly processed and bundled as static asset files by Metro.
config.resolver.assetExts.push('ttf', 'otf');

module.exports = config;
