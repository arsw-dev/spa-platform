import antfuConfig from '@antfu/eslint-config';

export default antfuConfig({
  type: 'lib',
  typescript: true,
  formatters: true,
  unicorn: true,
  stylistic: {
    indent: 2,
    semi: true,
    quotes: 'single',
  },
  ignores: ['LICENSE', '**/node_modules/**'],
}, {
  rules: {
    'ts/consistent-type-definitions': ['error', 'type'],
    'antfu/no-top-level-await': ['off'],
    'antfu/top-level-function': ['off'],
    'node/prefer-global/process': ['off'],
    'node/no-process-env': ['error'],
    'perfectionist/sort-imports': ['error'],
    'unicorn/filename-case': ['error', { case: 'kebabCase', ignore: ['README.md', 'LICENSE', 'CHANGELOG.md'] }],
  },
}, {
  // CloudFormation templates are linted by cfn-lint; quotes there carry meaning ('2010-09-09' would otherwise parse as
  // a date, and IAM condition values like 'true' are strings)
  files: ['cloudformation/**/*.yaml'],
  rules: {
    'yaml/plain-scalar': ['off'],
  },
}, {
  // CLI tools report progress on stdout, and tests use the built-in node:test runner rather than Vitest
  files: ['tools/**/*', 'modules/**/*.test.ts'],
  rules: {
    'no-console': ['off'],
    'test/no-import-node-test': ['off'],
  },
});
