module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  roots: ['<rootDir>'],
  transformIgnorePatterns: [
    '/node_modules/(?!(?:@turf)/)',
  ],
};
