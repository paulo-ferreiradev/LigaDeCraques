// WHY: Vercel inherently blocks all HTTP URL requests containing the string 'node_modules' for security.
// Since Expo's Metro Web bundler places native packages' static assets (like vector icon ttf files) 
// inside 'dist/assets/node_modules/...', requests for these icons result in 404 loads.
// This plugin intercepts the asset bundling pipeline and rewrites 'node_modules' to 'vendor_modules'.
// Metro will physically output the assets to 'dist/assets/vendor_modules/...' and reference this safe path in the JS bundle.
module.exports = function (assetData) {
  if (assetData.httpServerLocation && assetData.httpServerLocation.includes('node_modules')) {
    assetData.httpServerLocation = assetData.httpServerLocation.replace(/node_modules/g, 'vendor_modules');
  }
  return assetData;
};
