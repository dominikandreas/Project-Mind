const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // THIS IS THE MAGIC: It disables the browser CORS policy entirely
      webSecurity: false 
    }
  });

  // In development, load the Vite dev server
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000');
    // win.webContents.openDevTools(); // Uncomment to open devtools by default
  } else {
    // In production, load the built static files
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
