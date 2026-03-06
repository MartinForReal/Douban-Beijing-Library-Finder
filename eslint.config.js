const neostandard = require('neostandard');
const globals = require('globals');

module.exports = [
  ...neostandard({ semi: true }),
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        chrome: 'readonly',
        browser: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      camelcase: ['error', { allow: ['^md5_'] }]
    }
  },
  {
    ignores: ['dist/**', 'node_modules/**']
  }
];
