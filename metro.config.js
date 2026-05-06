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
};

module.exports = config;
