const dotenv = require('dotenv');
// Optional: load .env file if present
dotenv.config();

const brand = process.env.BRAND || 'BillingPro';
const appId = `com.yourcompany.${process.env.BRAND || 'billing'}`;

/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
module.exports = {
  productName: brand,
  appId: appId,
  directories: {
    output: "release",
    buildResources: "public/activeBrand"
  },
  files: [
    "dist/**/*",
    "electron/**/*",
    "package.json"
  ],
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"]
      }
    ],
    icon: "public/activeBrand/icon.ico"
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true
  }
};
