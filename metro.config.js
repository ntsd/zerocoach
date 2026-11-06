// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { execSync } = require('child_process');

// Automatically resolve Git short SHA if not explicitly provided
if (!process.env.EXPO_PUBLIC_GIT_SHA) {
  try {
    process.env.EXPO_PUBLIC_GIT_SHA = execSync('git rev-parse --short HEAD')
      .toString()
      .trim();
  } catch {
    process.env.EXPO_PUBLIC_GIT_SHA =
      process.env.EAS_BUILD_GIT_COMMIT_HASH?.slice(0, 7) ||
      process.env.GITHUB_SHA?.slice(0, 7) ||
      '';
  }
}

const config = getDefaultConfig(__dirname);

module.exports = config;

