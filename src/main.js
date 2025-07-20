const { app, BrowserWindow, ipcMain, globalShortcut, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const https = require('https');
const http = require('http');
const url = require('url');
const Database = require('./services/database.js');
const GameManager = require('./services/gameManager.js');

let mainWindow;
let gameManager;
let database;
let imageCacheDir;
let globalImageCache = new Map(); // Shared cache across all instances

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: false, // Start windowed for debugging
    frame: true, // Show frame for debugging
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false, // Allow loading local files
      nodeIntegrationInWorker: true
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  // Load the HTML file
  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // Hide menu bar
  mainWindow.setMenuBarVisibility(false);

  // Always open dev tools for debugging
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Register global shortcuts for debugging
  globalShortcut.register('F11', () => {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  });

  globalShortcut.register('F12', () => {
    mainWindow.webContents.toggleDevTools();
  });
}

app.whenReady().then(async () => {
  // Initialize database and game manager
  database = new Database();
  await database.init();
  
  gameManager = new GameManager(database);
  await gameManager.init();

  // Setup persistent image cache directory
  imageCacheDir = path.join(app.getPath('userData'), 'images');
  if (!fs.existsSync(imageCacheDir)) {
    fs.mkdirSync(imageCacheDir, { recursive: true });
  }
  
  console.log('Image cache directory:', imageCacheDir);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC Handlers
ipcMain.handle('get-games', async () => {
  return await gameManager.getAllGames();
});

// Check if all game images are cached
ipcMain.handle('check-all-images-cached', async (event, games) => {
  try {
    const crypto = require('crypto');
    const missingImages = [];
    
    for (const game of games) {
      if (game.boxArt && game.boxArt.trim() !== '') {
        const urlHash = crypto.createHash('md5').update(game.boxArt).digest('hex');
        const fileExtension = path.extname(url.parse(game.boxArt).pathname) || '.jpg';
        const localPath = path.join(imageCacheDir, `${urlHash}${fileExtension}`);
        
        if (!fs.existsSync(localPath)) {
          missingImages.push({
            url: game.boxArt,
            localPath: localPath,
            gameTitle: game.title
          });
        }
      }
    }
    
    return {
      success: true,
      allCached: missingImages.length === 0,
      missingCount: missingImages.length,
      missingImages: missingImages
    };
  } catch (error) {
    console.error('Error checking image cache:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-game', async (event, gameData) => {
  return await gameManager.addGame(gameData);
});



ipcMain.handle('delete-game', async (event, gameId) => {
  return await gameManager.deleteGame(gameId);
});

ipcMain.handle('get-settings', async () => {
  return await database.getSettings();
});

ipcMain.handle('update-settings', async (event, settings) => {
  return await database.updateSettings(settings);
});

ipcMain.handle('show-dialog', async (event, options) => {
  return await dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('app-quit', async () => {
  app.quit();
});

ipcMain.handle('launch-game', async (event, gameId) => {
  const game = await gameManager.getGame(gameId);
  if (!game) return { success: false, error: 'Game not found' };

  try {
    // Hide the main window
    mainWindow.hide();

    // Launch the game
    const gameProcess = spawn(game.executable, game.args || [], {
      detached: true,
      stdio: 'ignore'
    });

    // Wait for the game process to exit
    gameProcess.on('close', () => {
      // Show the main window again
      mainWindow.show();
      mainWindow.focus();
    });

    return { success: true };
  } catch (error) {
    mainWindow.show();
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-game', async (event, gameId, gameData) => {
  return await gameManager.updateGame(gameId, gameData);
});

ipcMain.handle('scan-retroarch-cores', async () => {
  return await gameManager.scanRetroArchCores();
});

ipcMain.handle('system-shutdown', () => {
  spawn('sudo', ['shutdown', '-h', 'now'], { detached: true, stdio: 'ignore' });
});

ipcMain.handle('system-reboot', () => {
  spawn('sudo', ['reboot'], { detached: true, stdio: 'ignore' });
});

// Check if image is already cached
ipcMain.handle('check-image-cache', async (event, imageUrl) => {
  try {
    const crypto = require('crypto');
    const urlHash = crypto.createHash('md5').update(imageUrl).digest('hex');
    const fileExtension = path.extname(url.parse(imageUrl).pathname) || '.jpg';
    const localPath = path.join(imageCacheDir, `${urlHash}${fileExtension}`);
    
    if (fs.existsSync(localPath)) {
      const stats = fs.statSync(localPath);
      return { 
        success: true, 
        localPath: localPath, 
        exists: true, 
        size: stats.size 
      };
    } else {
      return { 
        success: true, 
        localPath: localPath, 
        exists: false, 
        size: 0 
      };
    }
  } catch (error) {
    console.error('Error checking image cache:', error);
    return { success: false, error: error.message };
  }
});

// Image download handler for high-quality textures
ipcMain.handle('download-image', async (event, imageUrl) => {
  try {
    // Create a hash of the URL to use as filename
    const crypto = require('crypto');
    const urlHash = crypto.createHash('md5').update(imageUrl).digest('hex');
    const fileExtension = path.extname(url.parse(imageUrl).pathname) || '.jpg';
    const localPath = path.join(imageCacheDir, `${urlHash}${fileExtension}`);
    
    // Check if already cached
    if (fs.existsSync(localPath)) {
      console.log('Image already cached:', localPath);
      return { success: true, localPath: localPath };
    }
    
    console.log('Downloading image:', imageUrl);
    
    return new Promise((resolve, reject) => {
      const parsedUrl = url.parse(imageUrl);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const request = client.get(imageUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }
        
        const fileStream = fs.createWriteStream(localPath);
        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          console.log('Image downloaded successfully:', localPath);
          resolve({ success: true, localPath: localPath });
        });
        
        fileStream.on('error', (err) => {
          fs.unlink(localPath, () => {}); // Delete the file if it exists
          reject(err);
        });
      });
      
      request.on('error', (err) => {
        reject(err);
      });
      
      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error('Download timeout'));
      });
    });
  } catch (error) {
    console.error('Error downloading image:', error);
    return { success: false, error: error.message };
  }
});