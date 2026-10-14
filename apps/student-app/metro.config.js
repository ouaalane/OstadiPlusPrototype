// `expo/metro-config` provides the Expo-aware base config; `mergeConfig`
// (a generic deep-merge) comes from `@react-native/metro-config`.
const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * The student app consumes `@ostadiplus/shared` from the monorepo
 * (`packages/shared`), so Metro has to watch the workspace root and be able
 * to resolve its dependencies from there as well.
 *
 * NOTE: the base config must come from `expo/metro-config` (not
 * `@react-native/metro-config`) — Expo's serializer/masset handling is what
 * `expo export:embed` (Gradle `createBundleDebugJsAndAssets`) expects.
 */
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..', '..');

const defaultConfig = getDefaultConfig(projectRoot);

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

module.exports = mergeConfig(defaultConfig, config);
