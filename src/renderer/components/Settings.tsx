import { useState, useEffect, useRef } from 'react';
import { ShieldCheck, ShieldAlert, KeyRound, DownloadCloud, UploadCloud, RefreshCw } from 'lucide-react';
import { useToast } from './Toast';

export default function Settings() {
  const { showToast } = useToast();

  // Backup states
  const [backupPassword, setBackupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Restore states
  const [restorePassword, setRestorePassword] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedBackupPath, setSelectedBackupPath] = useState<string | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Update states
  const [updateStatus, setUpdateStatus] = useState<string>('idle');
  const [isUpdateReady, setIsUpdateReady] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    // Listeners
    const removeStatusListener = window.api.onUpdateStatus((status: string) => {
      if (status === 'checking') {
        setUpdateStatus('Checking for updates...');
      } else if (status === 'available') {
        setUpdateStatus('Update available!');
      } else if (status === 'up-to-date') {
        setUpdateStatus('App is up to date.');
        setIsCheckingUpdate(false);
      } else if (status === 'error') {
        setUpdateStatus('Error checking for updates.');
        setIsCheckingUpdate(false);
      } else if (status.startsWith('downloading:')) {
        const pct = status.split(':')[1];
        setUpdateStatus(`Downloading update: ${pct}%`);
      } else if (status === 'downloaded') {
        setUpdateStatus('Update downloaded. Ready to install.');
        setIsCheckingUpdate(false);
      }
    });

    const removeAvailableListener = window.api.onUpdateAvailable((available: boolean, version?: string) => {
      if (available && version) {
        setNewVersion(version);
        setShowUpdatePrompt(true);
      }
    });

    const removeDownloadedListener = window.api.onUpdateDownloaded((ready: boolean) => {
      if (ready) {
        setIsUpdateReady(true);
      }
    });

    return () => {
      removeStatusListener();
      removeAvailableListener();
      removeDownloadedListener();
    };
  }, []);

  const handleCheckUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatus('Checking for updates...');
    const result = await window.api.checkForUpdates();
    if (!result.success) {
      setUpdateStatus(`Update check failed: ${result.error}`);
      setIsCheckingUpdate(false);
    }
  };

  const handleInstallUpdate = async () => {
    await window.api.quitAndInstall();
  };

  const handleStartDownload = async () => {
    setShowUpdatePrompt(false);
    setUpdateStatus('Downloading update...');
    try {
      const result = await window.api.downloadUpdate();
      if (!result.success) {
        setUpdateStatus(`Download failed: ${result.error}`);
        showToast(`Download failed: ${result.error}`, 'error');
      }
    } catch (err: any) {
      setUpdateStatus(`Download error: ${err.message}`);
      showToast(`Download error: ${err.message}`, 'error');
    }
  };

  const handleBackupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!backupPassword) {
      showToast('Please enter a password to encrypt your backup', 'error');
      return;
    }

    if (backupPassword !== confirmPassword) {
      showToast('Passwords do not match. Please verify.', 'error');
      return;
    }

    if (backupPassword.length < 4) {
      showToast('Security password should be at least 4 characters long', 'error');
      return;
    }

    try {
      setIsBackingUp(true);
      const result = await window.api.backupDatabase(backupPassword);
      if (result.success) {
        showToast('Local database compressed and encrypted successfully!', 'success');
        setBackupPassword('');
        setConfirmPassword('');
      } else {
        if (result.error !== 'Canceled by user') {
          showToast(`Backup failed: ${result.error}`, 'error');
        }
      }
    } catch (err: any) {
      showToast(`Backup error: ${err.message}`, 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleSelectBackupAndOpenRestore = async () => {
    try {
      const selectResult = await window.api.selectBackupFile();
      if (selectResult.canceled || !selectResult.filePath) {
        return;
      }
      setSelectedBackupPath(selectResult.filePath);
      setRestorePassword('');
      setShowRestoreModal(true);
    } catch (err: any) {
      showToast(`Error selecting backup file: ${err.message}`, 'error');
    }
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!restorePassword) {
      showToast('Please enter the decryption password for the backup file', 'error');
      return;
    }

    if (!selectedBackupPath) {
      showToast('No backup file selected', 'error');
      return;
    }

    try {
      setIsRestoring(true);
      const result = await window.api.restoreDatabase(selectedBackupPath, restorePassword);
      if (result.success) {
        showToast('Vault restored successfully!', 'success');
        setShowRestoreModal(false);
        setSelectedBackupPath(null);
        setRestorePassword('');
      } else {
        if (result.error === 'WRONG_PASSWORD') {
          showToast('Failed to decrypt: Incorrect password entered.', 'error');
          setRestorePassword('');
          setTimeout(() => {
            passwordInputRef.current?.focus();
          }, 50);
        } else {
          showToast(`Restore failed: ${result.error}`, 'error');
        }
      }
    } catch (err: any) {
      showToast(`Restore error: ${err.message}`, 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2 pb-6 max-w-4xl select-none">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 font-medium">Manage your offline vault configurations and data locks.</p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Encryption Backup Box */}
        <div className="p-6 rounded-2xl border border-border bg-card/20 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-emerald/10 text-accent-emerald">
              <DownloadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-200">Encrypted Backup</h3>
              <p className="text-xs text-gray-500">Securely export your vault transactions and valuations.</p>
            </div>
          </div>

          <div className="text-xs font-semibold text-gray-400 bg-gray-900/30 p-3 rounded-xl border border-border/50 flex gap-2.5 leading-relaxed">
            <ShieldCheck className="w-5 h-5 text-accent-emerald flex-shrink-0" />
            <span>
              Your backup file is compressed into a ZIP and encrypted using **AES-256-GCM** via your password. Filenames and internal database structures are completely hidden.
            </span>
          </div>

          <form onSubmit={handleBackupSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500">Create Encryption Password</label>
              <input
                type="password"
                required
                placeholder="Enter password..."
                value={backupPassword}
                onChange={(e) => setBackupPassword(e.target.value)}
                className="w-full bg-card/50 border border-border rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent-indigo"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500">Confirm Encryption Password</label>
              <input
                type="password"
                required
                placeholder="Repeat password..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-card/50 border border-border rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent-indigo"
              />
            </div>

            <button
              type="submit"
              disabled={isBackingUp}
              className="mt-2 w-full py-3 rounded-xl bg-accent-indigo hover:bg-accent-indigo/90 text-white font-semibold text-sm shadow-glow-indigo transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {isBackingUp ? 'Processing Backup...' : 'Generate Encrypted Backup (.enc)'}
            </button>
          </form>
        </div>

        {/* Restore Backup Box */}
        <div className="p-6 rounded-2xl border border-border bg-card/20 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-rose/10 text-accent-rose">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-200">Decrypt & Restore</h3>
              <p className="text-xs text-gray-500">Restore your financial logs from an encrypted file.</p>
            </div>
          </div>

          <div className="text-xs font-semibold text-accent-rose bg-accent-rose/10 p-3 rounded-xl border border-accent-rose/20 flex gap-2.5 leading-relaxed">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>
              **WARNING**: Restoring from a backup replaces your current offline database entirely. Any unbacked-up data in the vault will be lost.
            </span>
          </div>

          <div className="flex flex-col gap-4 mt-auto">
            <button
              type="button"
              onClick={handleSelectBackupAndOpenRestore}
              disabled={isRestoring}
              className="mt-8 w-full py-3 rounded-xl border border-accent-rose text-accent-rose hover:bg-accent-rose/10 font-semibold text-sm transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {isRestoring ? 'Restoring Vault...' : 'Select Backup File & Restore'}
            </button>
          </div>
        </div>

        {/* Software Updates Box */}
        <div className="p-6 rounded-2xl border border-border bg-card/20 flex flex-col gap-5 md:col-span-2 mt-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-indigo/10 text-accent-indigo">
              <RefreshCw className={`w-5 h-5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-200">Software Updates</h3>
              <p className="text-xs text-gray-500">Check for updates and download standalone releases from GitHub.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900/30 p-4 rounded-xl border border-border/50">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-400 font-semibold">Update Status</span>
              <span className="text-sm font-bold text-gray-200">
                {updateStatus === 'idle' ? 'No updates checked yet.' : updateStatus}
              </span>
              {newVersion && (
                <span className="text-[10px] font-extrabold text-accent-indigo bg-accent-indigo/10 px-2 py-0.5 rounded w-max mt-1">
                  Version {newVersion} Available
                </span>
              )}
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              {isUpdateReady ? (
                <button
                  onClick={handleInstallUpdate}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-accent-emerald text-white font-semibold text-sm shadow-glow-emerald transition-all animate-pulse"
                >
                  Restart App to Load Update
                </button>
              ) : (
                <button
                  onClick={handleCheckUpdates}
                  disabled={isCheckingUpdate}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-accent-indigo hover:bg-accent-indigo/90 text-white font-semibold text-sm shadow-glow-indigo transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isCheckingUpdate ? 'Checking...' : 'Check for Updates'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Decryption Password Modal Overlay */}
      {showRestoreModal && selectedBackupPath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-card/95 border border-border p-6 rounded-2xl shadow-2xl flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent-rose/10 text-accent-rose">
                <KeyRound className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-200">Vault Decryption & Restore</h3>
                <p className="text-xs text-gray-500">Provide password to decrypt and restore data.</p>
              </div>
            </div>

            {/* RESTORE WARNING PANEL */}
            <div className="text-xs font-semibold text-accent-rose bg-accent-rose/10 p-3.5 rounded-xl border border-accent-rose/25 flex gap-2.5 leading-normal">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-accent-rose animate-bounce" />
              <div>
                <span className="font-extrabold uppercase tracking-wide">Restore Hazard:</span>
                <p className="mt-0.5 text-gray-400 font-medium">
                  This will permanently delete and overwrite all current transactions and assets in this vault. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="text-xs text-gray-400 bg-gray-900/40 p-3 rounded-xl border border-border/50 break-all leading-normal flex flex-col gap-1">
              <span className="font-semibold text-gray-300">File Selected:</span>
              <div className="text-[11px] font-mono text-gray-400 bg-card/50 p-1.5 rounded border border-border/30">
                {selectedBackupPath.split(/[\\/]/).pop()}
              </div>
            </div>

            <form onSubmit={handleRestoreSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Decryption Password</label>
                <input
                  ref={passwordInputRef}
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter backup password..."
                  value={restorePassword}
                  onChange={(e) => setRestorePassword(e.target.value)}
                  className="w-full bg-card/50 border border-border rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent-indigo"
                />
              </div>

              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRestoreModal(false);
                    setSelectedBackupPath(null);
                    setRestorePassword('');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-border text-gray-400 hover:text-gray-200 hover:bg-card text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRestoring}
                  className="flex-1 py-2.5 rounded-xl bg-accent-rose text-white hover:bg-accent-rose/90 text-sm font-semibold shadow-glow-rose transition-all disabled:opacity-50"
                >
                  {isRestoring ? 'Restoring...' : 'Decrypt & Restore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Available Prompt Modal */}
      {showUpdatePrompt && newVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-card/95 border border-border p-6 rounded-2xl shadow-2xl flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent-indigo/10 text-accent-indigo">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-200">New Update Available</h3>
                <p className="text-xs text-gray-500">Version {newVersion} is now available.</p>
              </div>
            </div>

            <div className="text-xs text-gray-400 bg-gray-900/40 p-4 rounded-xl border border-border/50 leading-relaxed flex flex-col gap-2.5">
              <span className="font-semibold text-gray-300">Update Details:</span>
              <p>
                FinTrack will download the latest update files automatically. The installation will run seamlessly in the background.
              </p>
              <div className="text-[11px] text-accent-indigo font-semibold bg-accent-indigo/10 p-2 rounded border border-accent-indigo/20">
                ⚠️ Secure Local Storage: All vault transactions and assets will be fully preserved during this update. No data is lost.
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowUpdatePrompt(false);
                  setIsCheckingUpdate(false);
                  setUpdateStatus(`Update available (v${newVersion})`);
                }}
                className="flex-1 py-2.5 rounded-xl border border-border text-gray-400 hover:text-gray-200 hover:bg-card text-sm font-semibold transition-all"
              >
                Later
              </button>
              <button
                type="button"
                onClick={handleStartDownload}
                className="flex-1 py-2.5 rounded-xl bg-accent-indigo text-white hover:bg-accent-indigo/90 text-sm font-semibold shadow-glow-indigo transition-all"
              >
                Download & Install
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
