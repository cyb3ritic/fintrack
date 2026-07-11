import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import AdmZip from 'adm-zip';
import * as db from './db';
import { autoUpdater } from 'electron-updater';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 950,
    minHeight: 700,
    backgroundColor: '#0d0f12',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Remove standard menu bar for custom premium dashboard look
  mainWindow.setMenuBarVisibility(false);

  // In development, load from Vite dev server. In production, load build folder index.html
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize application
app.whenReady().then(() => {
  db.initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    db.closeDatabase();
    app.quit();
  }
});

// Helper: Encrypt buffer using AES-256-GCM and PBKDF2
function encryptBuffer(buffer: Buffer, password: string): Buffer {
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // Format: Salt (16) + IV (12) + Tag (16) + Encrypted Data
  return Buffer.concat([salt, iv, authTag, encrypted]);
}

// Helper: Decrypt buffer using AES-256-GCM and PBKDF2
function decryptBuffer(buffer: Buffer, password: string): Buffer {
  const salt = buffer.subarray(0, 16);
  const iv = buffer.subarray(16, 28);
  const authTag = buffer.subarray(28, 44);
  const encrypted = buffer.subarray(44);

  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

// ----------------------------------------------------
// ELECTRON IPC DB ROUTER
// ----------------------------------------------------

ipcMain.handle('db:get-transactions', async (_, filters) => {
  return db.getTransactions(filters);
});

ipcMain.handle('db:add-transaction', async (_, tx) => {
  return db.addTransaction(tx);
});

ipcMain.handle('db:update-transaction', async (_, id, tx) => {
  return db.updateTransaction(Number(id), tx);
});

ipcMain.handle('db:delete-transaction', async (_, id) => {
  return db.deleteTransaction(Number(id));
});

ipcMain.handle('db:get-categories', async () => {
  return db.getCategories();
});

ipcMain.handle('db:add-category', async (_, cat) => {
  return db.addCategory(cat);
});

ipcMain.handle('db:update-category', async (_, id, cat) => {
  return db.updateCategory(id, cat);
});

ipcMain.handle('db:delete-category', async (_, id) => {
  return db.deleteCategory(id);
});

ipcMain.handle('db:get-stats', async (_, range) => {
  return db.getStats(range);
});

ipcMain.handle('db:get-goals', async () => {
  return db.getGoals();
});

ipcMain.handle('db:add-goal', async (_, goal) => {
  return db.addGoal(goal);
});

ipcMain.handle('db:update-goal', async (_, id, goal) => {
  return db.updateGoal(id, goal);
});

ipcMain.handle('db:delete-goal', async (_, id) => {
  return db.deleteGoal(id);
});

// ----------------------------------------------------
// BACKUP & RESTORE IPC HANDLERS
// ----------------------------------------------------

ipcMain.handle('sys:backup', async (_, password) => {
  if (!mainWindow) return { success: false, error: 'No active window' };

  const tempBackupPath = path.join(app.getPath('temp'), `fintrack_temp_backup_${Date.now()}.db`);

  try {
    // Generate default path with YYYY-MM-DD_HH-MM-SS timestamp
    const now = new Date();
    const dateStr = now.toISOString().substring(0, 10); // '2026-07-02'
    const timeStr = now.toTimeString().substring(0, 8).replace(/:/g, '-'); // '08-29-13'
    const defaultFileName = `finance_backup_${dateStr}_${timeStr}.enc`;

    // Show save dialog to user
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Encrypted Financial Backup',
      defaultPath: path.join(app.getPath('downloads'), defaultFileName),
      filters: [{ name: 'Encrypted Backups', extensions: ['enc'] }],
    });

    if (canceled || !filePath) {
      return { success: false, error: 'Canceled by user' };
    }

    // Create a clean point-in-time SQLite backup copy to capture WAL checkpointed data
    await db.backupDatabase(tempBackupPath);

    // Zip database copy file in-memory using adm-zip
    const zip = new AdmZip();
    zip.addLocalFile(tempBackupPath, undefined, 'tracker.db');
    const zipBuffer = zip.toBuffer();

    // Encrypt the zip buffer with the user's password
    const encryptedBuffer = encryptBuffer(zipBuffer, password);

    // Save the encrypted ZIP
    fs.writeFileSync(filePath, encryptedBuffer);

    return { success: true, filePath };
  } catch (error: any) {
    console.error('Backup error:', error);
    return { success: false, error: error.message };
  } finally {
    // Clean up temporary database copy
    if (fs.existsSync(tempBackupPath)) {
      try { fs.unlinkSync(tempBackupPath); } catch {}
    }
  }
});

ipcMain.handle('sys:select-backup-file', async () => {
  if (!mainWindow) return { canceled: true };
  const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Encrypted Financial Backup',
    filters: [{ name: 'Encrypted Backups', extensions: ['enc'] }],
    properties: ['openFile'],
  });
  if (canceled || filePaths.length === 0) {
    return { canceled: true };
  }
  return { canceled: false, filePath: filePaths[0] };
});

ipcMain.handle('sys:restore', async (_, filePath, password) => {
  if (!mainWindow) return { success: false, error: 'No active window' };

  try {
    const encryptedBuffer = fs.readFileSync(filePath);

    let zipBuffer: Buffer;
    try {
      // Attempt decryption with password
      zipBuffer = decryptBuffer(encryptedBuffer, password);
    } catch (decryptError) {
      return { success: false, error: 'WRONG_PASSWORD' };
    }

    // Close the current DB before overwriting the file
    db.closeDatabase();

    const dbPath = db.getDatabasePath();

    // Delete WAL and SHM files to prevent SQLite checkpoint recovery conflicts
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;
    if (fs.existsSync(walPath)) {
      try { fs.unlinkSync(walPath); } catch {}
    }
    if (fs.existsSync(shmPath)) {
      try { fs.unlinkSync(shmPath); } catch {}
    }

    // Unzip the decrypted buffer in-memory
    const zip = new AdmZip(zipBuffer);
    
    // Find the db entry in zip
    const zipEntries = zip.getEntries();
    const dbEntry = zipEntries.find(entry => entry.entryName === 'tracker.db');

    if (!dbEntry) {
      // Re-init current db in case of failure
      db.initDatabase();
      return { success: false, error: 'Invalid backup structure: tracker.db not found' };
    }

    // Write db file
    fs.writeFileSync(dbPath, dbEntry.getData());

    // Reopen/initialize database
    db.initDatabase();

    // Reload the main window to force frontend reload
    mainWindow.reload();

    return { success: true };
  } catch (error: any) {
    console.error('Restore error:', error);
    // Ensure database is initialized in case of sudden error
    try { db.initDatabase(); } catch {}
    return { success: false, error: error.message };
  }
});

// ----------------------------------------------------
// AUTO-UPDATER EVENTS & LOGIC
// ----------------------------------------------------

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('checking-for-update', () => {
  mainWindow?.webContents.send('update:status', 'checking');
});

autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('update:status', 'available');
  mainWindow?.webContents.send('update:available', true, info.version);
});

autoUpdater.on('update-not-available', () => {
  mainWindow?.webContents.send('update:status', 'up-to-date');
  mainWindow?.webContents.send('update:available', false);
});

autoUpdater.on('error', (err) => {
  mainWindow?.webContents.send('update:status', 'error');
  console.error('Auto-updater error:', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  mainWindow?.webContents.send('update:status', `downloading:${Math.round(progressObj.percent)}`);
});

autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('update:status', 'downloaded');
  mainWindow?.webContents.send('update:downloaded', true);
});

ipcMain.handle('sys:check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdatesAndNotify();
    return { success: true, result };
  } catch (err: any) {
    console.error('Update check fail:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('sys:download-update', async () => {
  try {
    const result = await autoUpdater.downloadUpdate();
    return { success: true, result };
  } catch (err: any) {
    console.error('Download update fail:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('sys:quit-and-install', async () => {
  // quit and install silently (first argument true), and restart after install (second argument true)
  autoUpdater.quitAndInstall(true, true);
});
