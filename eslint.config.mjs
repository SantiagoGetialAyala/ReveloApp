import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

const tsFiles = ['apps/**/*.ts', 'apps/**/*.tsx', 'packages/**/*.ts', 'tests/**/*.ts'];

export default [
  {
    ignores: [
      '**/.next/**',
      '**/.next-dev/**',
      '**/dist/**',
      '**/node_modules/**',
      'apps/web/next-env.d.ts',
    ],
  },
  js.configs.recommended,
  {
    files: tsFiles,
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      'no-undef': 'off',
    },
  },
  {
    files: ['apps/web/**/*.js', 'apps/web/**/*.cjs'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['apps/web/**/*.ts', 'apps/web/**/*.tsx'],
    plugins: { '@next/next': nextPlugin, 'react-hooks': reactHooks },
    rules: nextPlugin.configs.recommended.rules,
  },
];
