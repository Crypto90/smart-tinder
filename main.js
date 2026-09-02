const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

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

  // TEMPORARY DEBUG: Dump DOM elements when on explore page
  mainWindow.webContents.on('did-navigate-in-page', (event, url) => {
    if (url.includes('explore')) {
      setTimeout(() => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        mainWindow.webContents.executeJavaScript(`
          (function() {
            const links = Array.from(document.querySelectorAll('a, div, button'));
            const filtered = links.map(el => el.outerHTML).filter(h => typeof h === 'string' && (h.includes('/explore') || h.includes('/app/explore')) && h.length < 500);
            return filtered.join('\\n---SPLIT---\\n');
          })();
        `).then(result => console.log("====== DOM DUMP START ======\\n", result, "\\n====== DOM DUMP END ======")).catch(console.error);
      }, 5000); // Wait 5s for react to render
    }
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
});

ipcMain.on('st-toggle-devtools', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.toggleDevTools();
  }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});
