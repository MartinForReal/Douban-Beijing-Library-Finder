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
        ...globals.worker, // service-worker globals (importScripts, self, ...)
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
    // background.js calls the global md5 exposed by md5.js via importScripts
    files: ['background.js'],
    languageOptions: {
      globals: { md5: 'readonly' }
    }
  },
  {
    // md5.js is a global library consumed by background.js via importScripts;
    // treat its only export as used rather than flagging it as an unused local.
    files: ['md5.js'],
    rules: { 'no-unused-vars': 'off' }
  },
  {
    ignores: ['dist/**', 'node_modules/**']
  }
];
