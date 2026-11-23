import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
    { ignores: ['dist', 'node_modules'] },
    {
        files: ['**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { ...globals.browser },
            parserOptions: { ecmaFeatures: { jsx: true } },
        },
        settings: { react: { version: 'detect' } },
        plugins: { react, 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
        rules: {
            ...js.configs.recommended.rules,
            ...react.configs.recommended.rules,
            ...react.configs['jsx-runtime'].rules,
            ...reactHooks.configs.recommended.rules,
            'react/prop-types': 'off',
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            eqeqeq: ['error', 'always'],
            'prefer-const': 'error',
        },
    },
    {
        files: ['vite.config.js', 'eslint.config.js'],
        languageOptions: { globals: { ...globals.node } },
    },
    {
        files: ['**/*.test.{js,jsx}', 'src/test/**'],
        languageOptions: { globals: { ...globals.browser, ...globals.vitest } },
    },
];
