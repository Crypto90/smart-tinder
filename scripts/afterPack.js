const { execSync } = require('child_process');
const path = require('path');

exports.default = async function (context) {
  if (context.electronPlatformName !== 'darwin') return;
  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  console.log(`[afterPack] Applying clean ad-hoc code signature to: ${appPath}`);
  try {
    execSync(`codesign --force --deep -s - "${appPath}"`, { stdio: 'inherit' });
    console.log('[afterPack] Ad-hoc signing succeeded!');
  } catch (err) {
    console.warn('[afterPack] Ad-hoc signing warning:', err.message);
  }
};
