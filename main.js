const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
// Suppress Chromium AudioThreadHangMonitor noise on macOS
app.commandLine.appendSwitch('disable-features', 'AudioThreadHangMonitor');

// --- Release Update Checker ---
function isNewerVersion(remote, local) {
  const rParts = (remote || '').replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const lParts = (local || '').replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(rParts.length, lParts.length); i++) {
    const r = rParts[i] || 0;
    const l = lParts[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

async function checkForUpdates(manual = false) {
  try {
    const response = await fetch('https://api.github.com/repos/Crypto90/smart-tinder/releases/latest', {
      headers: {
        'User-Agent': 'SmartTinder-Desktop-App',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      if (manual && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('st-update-not-available', {
          currentVersion: app.getVersion(),
          reason: 'No published releases found yet.'
        });
      }
      return;
    }

    const release = await response.json();
    const latestTag = release.tag_name;
    const currentVersion = app.getVersion();

    if (latestTag && isNewerVersion(latestTag, currentVersion)) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('st-update-available', {
          latestVersion: latestTag.replace(/^v/, ''),
          currentVersion,
          releaseUrl: release.html_url || 'https://github.com/Crypto90/smart-tinder/releases/latest',
          releaseName: release.name || latestTag,
          publishedAt: release.published_at
        });
      }
    } else if (manual) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('st-update-not-available', {
          currentVersion
        });
      }
    }
  } catch (err) {
    if (manual && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('st-update-error', { error: err.message });
    }
  }
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // Needed to run scripts contextually securely
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Dynamically set User-Agent to match exact Chrome version but strip Electron
  let ua = mainWindow.webContents.userAgent;
  ua = ua.replace(/Electron\/[0-9\.]+\s?/, '').replace(/smarttinder\/[0-9\.]+\s?/, '');
  mainWindow.webContents.userAgent = ua;

  // Toggle DevTools with F12 or Cmd/Ctrl+Option+I or Cmd/Ctrl+Shift+I
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      const isMac = process.platform === 'darwin';
      const isCmdOrCtrl = isMac ? input.meta : input.control;
      if (
        input.key === 'F12' ||
        (isCmdOrCtrl && input.alt && input.key.toLowerCase() === 'i') ||
        (isCmdOrCtrl && input.shift && input.key.toLowerCase() === 'i')
      ) {
        mainWindow.webContents.toggleDevTools();
        event.preventDefault();
      }
    }
  });

  // Load Tinder
  mainWindow.loadURL('https://tinder.com');

  // Prevent window from being garbage collected
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', () => {
  // Set permission request handler to auto-allow geolocation and notifications for Tinder
  const { session } = require('electron');
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['geolocation', 'notifications'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Intercept and bypass Content-Security-Policy to allow our custom overlay styling
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = details.responseHeaders || {};
    
    // Only strip CSP from HTML pages, not API requests
    if (details.resourceType === 'mainFrame' || details.resourceType === 'subFrame') {
      for (const key in headers) {
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'content-security-policy' || lowerKey === 'content-security-policy-report-only') {
          delete headers[key];
        }
      }
    }
    callback({ cancel: false, responseHeaders: headers });
  });

  createWindow();

  // Run initial background update check after 5 seconds
  setTimeout(() => {
    checkForUpdates(false);
  }, 5000);
});

ipcMain.on('st-toggle-devtools', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.toggleDevTools();
  }
});

ipcMain.on('st-check-for-updates', () => {
  checkForUpdates(true);
});

ipcMain.on('st-open-url', (event, url) => {
  if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
    shell.openExternal(url);
  }
});

ipcMain.on('st-get-version', (event) => {
  event.returnValue = app.getVersion();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});
