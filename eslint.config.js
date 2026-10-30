// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'android/*', 'ios/*'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/dev/**', 'src/mock/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/mock/*', '**/mock/*'],
              message: 'Mock data must not be imported from production code.',
            },
          ],
        },
      ],
    },
  },
]);