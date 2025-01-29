const { app, BrowserWindow, screen, session } = require('electron');
const path = require('path');

function createWindow() {

  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.bounds;

  // Log geometry information for easier debugging
  console.log(`Primary Screen Geometry - Width: ${width} Height: ${height} X: ${x} Y: ${y}`);

  const mainWindow = new BrowserWindow({
    width: width * 0.6,
    height: height * 0.8,
    x: x + ((width - (width * 0.6)) / 2),
    y: y + ((height - (height * 0.8)) / 2),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    }
  });

  // Remove the menu from the BrowserWindow
  mainWindow.setMenu(null);

  // Inject CSS to hide scrollbar
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = details.responseHeaders;
    headers['Content-Security-Policy'] = [
      "default-src 'self'; style-src 'self' 'unsafe-inline';"
    ];
    callback({ cancel: false, responseHeaders: headers });
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(`
      ::-webkit-scrollbar { 
        display: none; 
      }
    `);
  });

  // Clear cookies on session start
  session.defaultSession.clearStorageData({ storages: ['cookies'] });

  // Intercept and cancel cookie storage
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (details.responseHeaders['Set-Cookie']) {
      delete details.responseHeaders['Set-Cookie'];
    }
    callback({ cancel: false, responseHeaders: details.responseHeaders });
  });

  // Prevent leaking IP
  mainWindow.webContents.session.setUserAgent(
    mainWindow.webContents.userAgent.replace(/Electron\/\d+\.\d+\.\d+/, '')
  );

  // Block well-known trackers
  const trackerList = [
    // Add known tracker and ad URLs here
    '*://*.doubleclick.net/*',
    '*://*.google-analytics.com/*',
    '*://*.googlesyndication.com/*',
  ];
  session.defaultSession.webRequest.onBeforeRequest({ urls: trackerList }, (details, callback) => {
    callback({ cancel: true });
  });

  // Ensure only HTTPS is used
  mainWindow.webContents.session.webRequest.onBeforeRequest({ urls: ['http://*/*'] }, (details, callback) => {
    callback({ cancel: true, redirectURL: details.url.replace('http://', 'https://') });
  });

  // Block Third-Party Cookies to prevent cross-site tracking
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'geolocation' || permission === 'notifications') {
      callback(false); // Deny these permissions
    } else {
      callback(true); // Allow other permissions
    }
  });
  session.defaultSession.cookies.on('changed', (event, cookie, cause, removed) => {
    if (cookie.domain !== '.yourdomain.com' && !removed) {
      session.defaultSession.cookies.remove(`http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`, cookie.name, () => {});
    }
  });

  mainWindow.loadFile('index.html'); // Load your index.html file
  //mainWindow.webContents.openDevTools();


  // Handle download events
  session.defaultSession.on('will-download', (event, item, webContents) => {
    const totalBytes = item.getTotalBytes();

    // Update the UI or log download status
    item.on('updated', (event, state) => {
      if (state === 'interrupted') {
        console.log('Download is interrupted but can be resumed');
      } else if (state === 'progressing') {
        if (item.isPaused()) {
          console.log('Download is paused');
        } else {
          const receivedBytes = item.getReceivedBytes();
          const progress = Math.round((receivedBytes / totalBytes) * 100);
          mainWindow.webContents.send('download-progress', progress);
          console.log(`Received bytes: ${receivedBytes} of ${totalBytes}`);
        }
      }
    });

    item.once('done', (event, state) => {
      if (state === 'completed') {
        mainWindow.webContents.send('download-complete', 'Download completed successfully!');
        console.log('Download completed successfully!');
      } else {
        mainWindow.webContents.send('download-complete', `Download failed: ${state}`);
        console.log(`Download failed: ${state}`);
      }
    });
  });
}

app.on('ready', createWindow);

app.on('before-quit', async () => {
  await session.defaultSession.clearCache();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
