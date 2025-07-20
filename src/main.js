import { app, BrowserWindow, ipcMain, globalShortcut, dialog } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import Database from './services/database.js';
import GameManager from './services/gameManager.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let gameManager;
let database;

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