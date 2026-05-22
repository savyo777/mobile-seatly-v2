const path = require('path');
const { getDefaultConfig } = require('@expo/metro-config');
const exclusionList = require('metro-config/private/defaults/exclusionList').default;

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.resolver.blockList = exclusionList([
  /node_modules\/\.deno\/.*/,
]);

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  zod: path.join(projectRoot, 'node_modules/zod'),
  // Shim @opentelemetry/api → empty module. supabase-js (≥ 2.106) does
  // a dynamic `import('@opentelemetry/api')` for optional Node tracing;
  // Hermes can't compile the dynamic-import expression with the
  // webpackIgnore/turbopackIgnore/vite-ignore magic comments. Mapping
  // the package to a real (empty) file lets Metro pre-resolve the
  // import to a noop module. supabase-js's `.catch(() => null)` makes
  // this safe — tracing is silently disabled on mobile, which is what
  // we want.
  '@opentelemetry/api': path.join(projectRoot, 'shims/opentelemetry-api.js'),
};

module.exports = config;
