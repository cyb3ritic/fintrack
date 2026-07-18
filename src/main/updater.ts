import { BrowserWindow, dialog, ipcMain } from 'electron';
import { autoUpdater, UpdateDownloadedEvent } from 'electron-updater';
import type { ProgressInfo } from 'electron-updater';

let mainWindow: BrowserWindow | null = null;

export function initUpdater(win: BrowserWindow) {
  mainWindow = win;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // --------------------------------------------------
  // Auto-updater event wiring
  // --------------------------------------------------

  autoUpdater.on('checking-for-update', () => {
    send('update:status', 'checking');
  });

  autoUpdater.on('update-available', (info) => {
    send('update:status', 'available');
    send('update:available', true, info.version);
  });

  autoUpdater.on('update-not-available', () => {
    send('update:status', 'up-to-date');
    send('update:available', false);
  });

  autoUpdater.on('error', (err) => {
    send('update:status', 'error');
    console.error('Auto-updater error:', err);
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    send('update:progress', {
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (_event: UpdateDownloadedEvent) => {
    send('update:status', 'downloaded');
    showUpdateDialog();
  });

  // --------------------------------------------------
  // IPC handlers invoked from renderer
  // --------------------------------------------------

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

  ipcMain.on('sys:quit-and-install', () => {
    autoUpdater.quitAndInstall(true, true);
  });
}

// --------------------------------------------------
// Native dialog when update is downloaded
// --------------------------------------------------

async function showUpdateDialog() {
  if (!mainWindow) return;

  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['Restart and Apply', 'Later'],
    defaultId: 0,
    cancelId: 1,
    title: 'Update Ready!',
    message: 'A fresh, optimized version of FinTrack has been downloaded.',
    detail: 'Would you like to restart and apply the upgrade now?',
  });

  if (response === 0) {
    autoUpdater.quitAndInstall(true, true);
  }
}

// --------------------------------------------------
// Typed helper to send IPC messages to renderer
// --------------------------------------------------

function send(channel: string, ...args: unknown[]) {
  mainWindow?.webContents.send(channel, ...args);
}
