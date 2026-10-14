const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * The student app consumes `@ostadiplus/shared` from the monorepo
 * (`packages/shared`), so Metro has to watch the workspace root and be able
 * to resolve its dependencies from there as well.
 */
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..', '..');

const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    extraNodeModules: {
      '@ostadiplus/shared': path.resolve(workspaceRoot, 'packages', 'shared'),
    },
    sourceExts: ['ts', 'tsx', 'js', 'jsx', 'json', 'cjs', 'mjs'],
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
