module.exports = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageDirectory: './coverage',
  coverageReporters: ['lcov', 'text', 'html', 'json', 'cobertura', 'clover'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/ui/**',
    '!src/glugen-templates.ts',
    '!src/__tests__/**',
    '!node_modules/**',
  ],
  coverageThreshold: {
    global: {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
    },
  },
};
