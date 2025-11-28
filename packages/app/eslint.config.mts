import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig([
	{
		files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
		plugins: { js },
		extends: ['js/recommended'],
		ignores: ['dist', 'build', 'node_modules'],
		languageOptions: {
			globals: globals.node,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname
			}
		}
	},
	tseslint.configs.recommendedTypeChecked,
	{
		rules: {
			'eqeqeq': 'error',
			'no-undef': 'off',
			'no-empty': 'warn',
			'prefer-const': 'warn',
			'require-await': 'off',
			'dot-notation': 'error',
			'no-useless-escape': 'off',
			'no-mixed-spaces-and-tabs': 'off',
			'@typescript-eslint/require-await': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'warn',
			'@typescript-eslint/no-require-imports': 'off',
			'@typescript-eslint/no-extra-semi': 'off',
			'@typescript-eslint/ban-ts-comment': 'warn',
			'@typescript-eslint/no-var-requires': 'warn',
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/no-inferrable-types': 'off',
			'@typescript-eslint/no-unused-vars': 'warn',
			'@typescript-eslint/no-misused-promises': 'off',
			'@typescript-eslint/no-floating-promises': 'off',
			'@typescript-eslint/no-unnecessary-type-assertion': 'warn'
		},
	}
]);
