/** @type {import("jest").Config} */
const jestExpo = require("jest-expo/jest-preset");

module.exports = {
  ...jestExpo,
  setupFiles: [
    "<rootDir>/jest.setup-fetch-guard.js",
    ...(jestExpo.setupFiles || []),
  ],
  moduleNameMapper: {
    ...(jestExpo.moduleNameMapper || {}),
    "^axios$": "<rootDir>/node_modules/axios/dist/node/axios.cjs",
  },
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"],
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
};
