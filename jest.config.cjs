module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./test/polyfills.cjs'],
  transform: {
    '^.+\\.(js|mjs)$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'mjs', 'json', 'node'],
  testMatch: ["**/test/**/*.test.js"],
  setupFilesAfterEnv: ["./test/setup.js"]
};
