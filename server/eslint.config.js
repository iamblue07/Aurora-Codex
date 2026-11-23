import js from '@eslint/js';
import globals from 'globals';

export default [
    { ignores: ['node_modules/', 'uploads/', 'logs/'] },
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { ...globals.node },
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
            'no-console': 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            eqeqeq: ['error', 'always'],
            curly: ['error', 'multi-line'],
            'object-shorthand': 'error',
            'no-param-reassign': ['error', { props: false }],
            'no-return-await': 'error',
            'require-await': 'error',
            'max-len': ['warn', { code: 120, ignoreStrings: true, ignoreTemplateLiterals: true, ignoreComments: true }],
        },
    },
    {
        // The logger and command-line scripts are the only places allowed to write to the console.
        files: ['src/utils/logger.js', 'scripts/**/*.js'],
        rules: { 'no-console': 'off' },
    },
    {
        // Code passed to page.evaluate() runs inside the browser, not in Node.
        files: ['src/services/scraper/scraper.service.js'],
        languageOptions: { globals: { ...globals.node, ...globals.browser } },
    },
];
