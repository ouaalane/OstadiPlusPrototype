// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // eslint-config-expo 57 enables the React Compiler lint rules from
    // eslint-plugin-react-hooks v7. This app does not opt into
    // `experiments.reactCompiler`, and its video/watermark code intentionally
    // mutates expo-video player objects. Keep the diagnostics visible as
    // warnings instead of failing lint until the app is made compiler-safe.
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
]);
