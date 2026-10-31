import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['out/', 'release/', 'node_modules/', 'test-results/', 'playwright-report/'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      // Интерфейс не должен знать о файловой системе: только идентификаторы правил.
      'no-restricted-imports': ['error', { patterns: ['node:*', 'fs', 'path', 'electron', '**/main/**'] }],
    },
  },
  {
    files: ['src/main/domain/**/*.ts', 'src/main/application/**/*.ts', 'src/main/rules/**/*.ts'],
    rules: {
      // Ядро работает с диском только через порт FileSystem.
      'no-restricted-imports': [
        'error',
        { patterns: ['node:fs', 'node:fs/*', 'fs', 'fs/*', 'electron', 'node:child_process', '**/infrastructure/**'] },
      ],
    },
  },
);
