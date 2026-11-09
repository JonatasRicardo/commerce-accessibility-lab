import jsxA11y from 'eslint-plugin-jsx-a11y';
import tsParser from '@typescript-eslint/parser';

export default [{
  files: ['examples/react-storefront/**/*.{ts,tsx}'],
  languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } } },
  plugins: { 'jsx-a11y': jsxA11y },
  rules: { ...jsxA11y.configs.recommended.rules },
}];
