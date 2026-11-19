import React, { useState, useEffect, useRef } from "react";
import {
  X,
  CheckCircle2,
  Download,
  RefreshCw,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { APP_VERSION, checkForAppUpdates } from "../version.js";

export default function VersionUpdateModal({ isOpen, onClose, isMandatory: propMandatory, initialUpdateData }) {
  const [checking, setChecking] = useState(!initialUpdateData);
  const [updateData, setUpdateData] = useState(initialUpdateData || null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ percent: 0, transferred: 0, total: 0 });
  const [readyToInstall, setReadyToInstall] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const autoStartedRef = useRef(false);

  const hasUpdate = Boolean(updateData?.hasUpdate);
  const isMandatory = hasUpdate || propMandatory || Boolean(updateData?.isMandatory);
  const latestVersion = updateData?.latestVersion || APP_VERSION;
  const updateSize = Number(downloadProgress.total || updateData?.downloadSizeBytes || 0);
  const checkFailed = !checking && updateData?.success === false;
  const fetchUpdateInfo = async () => {
    setChecking(true);
    try {
      const data = await checkForAppUpdates();
      setUpdateData(data);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialUpdateData) {
        setUpdateData(initialUpdateData);
        setChecking(false);
      } else {
        fetchUpdateInfo();
      }
    }
  }, [isOpen, initialUpdateData]);

  // Listen to IPC download progress events from Electron main process
  useEffect(() => {
    if (window.electronAPI?.onUpdateProgress) {
      const cleanup = window.electronAPI.onUpdateProgress((data) => {
        setDownloadProgress(data);
        if (data.percent >= 100) {
          setReadyToInstall(true);
        }
      });
      return cleanup;
    }
  }, []);

  const handleAutoUpdate = async () => {
    const url =
      updateData?.downloadUrl ||
      `https://github.com/Priyadharsant/Finance_Application/releases/download/v${latestVersion}/KAMBAM.FINANCE-Setup-${latestVersion}.exe`;

    // 1-Click in-app auto update for Electron Desktop
    if (window.electronAPI?.downloadAndInstallUpdate) {
      setDownloading(true);
      setDownloadError(null);
      setDownloadProgress({ percent: 0, transferred: 0, total: 0 });
      setReadyToInstall(false);

      try {
        const result = await window.electronAPI.downloadAndInstallUpdate(url, latestVersion);
        if (!result.success) {
          setDownloadError(result.error || "Update download failed");
          setDownloading(false);
          autoStartedRef.current = false;
        } else {
          setReadyToInstall(true);
        }
      } catch (err) {
        setDownloadError(err.message || "Failed to download update");
        setDownloading(false);
        autoStartedRef.current = false;
      }
    } else {
      // In web browser: trigger direct browser file download
      const a = document.createElement("a");
      a.href = url;
      a.download = `KAMBAM.FINANCE-Setup-${latestVersion}.exe`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleRetryAutoUpdate = () => {
    setDownloadError(null);
    autoStartedRef.current = false;
    handleAutoUpdate();
  };

  // Automatically start download and install as soon as an update is detected
  useEffect(() => {
    if (isOpen && hasUpdate && !downloading && !readyToInstall && !downloadError && !autoStartedRef.current) {
      autoStartedRef.current = true;
      handleAutoUpdate();
    }
  }, [isOpen, hasUpdate, downloading, readyToInstall, downloadError]);

  const handleManualBrowserDownload = () => {
    const url =
      updateData?.downloadUrl ||
      `https://github.com/Priyadharsant/Finance_Application/releases/download/v${latestVersion}/KAMBAM.FINANCE-Setup-${latestVersion}.exe`;
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleModalClose = () => {
    // If update is required or currently downloading, do NOT allow closing!
    if ((isMandatory && hasUpdate && !downloadError) || downloading) return;
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  const formatSize = (bytes) => {
    if (!Number.isFinite(bytes) || bytes < 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    return `${mb >= 100 ? mb.toFixed(0) : mb.toFixed(1)} MB`;
  };

  return (
    <div
      className={`appUpdateOverlay${isMandatory && hasUpdate ? " isRequired" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && (!isMandatory || !hasUpdate || downloadError) && !downloading) {
          handleModalClose();
        }
      }}
    >
      <section
        className="appUpdateCard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-update-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="appUpdateTop">
          <div className="appUpdateBrand"><span className="appUpdateBrandMark">₹</span><span>KAMBAM FINANCE</span></div>
          {(!hasUpdate || !isMandatory || downloadError) && !downloading && (
            <button type="button" className="appUpdateClose" onClick={handleModalClose} aria-label="Close">
              <X size={18} />
            </button>
          )}
        </header>

        {hasUpdate ? (
          <main className="appUpdateContent">
            <div className="appUpdateHeroIcon" aria-hidden="true"><Download size={30} strokeWidth={1.8} /></div>
            <span className="appUpdateEyebrow">App update</span>
            <h2 id="app-update-title">A better version is ready</h2>
            <p className="appUpdateIntro">A few improvements are on their way to your app.</p>

            <div className="appUpdateVersions" aria-label={`Version ${APP_VERSION} updating to version ${latestVersion}`}>
              <div className="appUpdateVersion"><small>Current</small><strong>Version {APP_VERSION}</strong></div>
              <span className="appUpdateVersionArrow" aria-hidden="true">→</span>
              <div className="appUpdateVersion isNew"><small>New</small><strong>Version {latestVersion}</strong></div>
            </div>

            <div className={`appUpdateProgressCard${downloadError ? " hasError" : readyToInstall ? " isReady" : ""}`}>
              <div className="appUpdateProgressTop">
                <div className="appUpdateProgressIcon" aria-hidden="true">
                  {downloadError ? <AlertTriangle size={18} /> : readyToInstall ? <CheckCircle2 size={18} /> : <RefreshCw size={17} className="spin" />}
                </div>
                <div className="appUpdateProgressCopy">
                  <strong>{downloadError ? "We couldn’t get the update" : readyToInstall ? "Update downloaded" : "Downloading update"}</strong>
                  <span>{downloadError ? "Please try again, or download it using your browser." : readyToInstall ? "Your app is ready to restart." : "Your app will restart when it’s ready."}</span>
                </div>
                {!downloadError && <span className="appUpdatePercent">{readyToInstall ? "100%" : `${downloadProgress.percent}%`}</span>}
              </div>
              {!downloadError && (
                <>
                  <div className="appUpdateProgress" role="progressbar" aria-label="Update download progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={downloadProgress.percent}>
                    <span style={{ width: `${Math.max(readyToInstall ? 100 : 3, downloadProgress.percent)}%` }} />
                  </div>
                  {!readyToInstall && (
                    <div className="appUpdateDownloadDetails" aria-live="polite">
                      <span><strong>{formatSize(downloadProgress.transferred)}</strong> of <strong>{updateSize > 0 ? formatSize(updateSize) : "Size unavailable"}</strong></span>
                      <span><strong>{downloadProgress.speed || "0 MB/s"}</strong></span>
                    </div>
                  )}
                </>
              )}
            </div>
            <p className="appUpdateHelper">This should only take a little while.</p>
            {downloadError && (
              <div className="appUpdateActions">
                <button type="button" className="appUpdateButton secondary" onClick={handleRetryAutoUpdate}><RefreshCw size={16} /> Try again</button>
                <button type="button" className="appUpdateButton primary" onClick={handleManualBrowserDownload}><Download size={16} /> Download update</button>
              </div>
            )}
          </main>
        ) : (
          <main className="appUpdateContent appUpdatePlainState">
            <div className="appUpdateHeroIcon" aria-hidden="true">{checking ? <Loader2 size={29} className="spin" /> : checkFailed ? <AlertTriangle size={29} /> : <CheckCircle2 size={29} />}</div>
            <h2 id="app-update-title">{checking ? "Checking for updates" : checkFailed ? "Couldn’t check for updates" : "You’re up to date"}</h2>
            <p className="appUpdateIntro">{checking ? "Please wait a moment." : checkFailed ? "Please try again when you’re back online." : `You’re using the latest version, ${APP_VERSION}.`}</p>
            <div className="appUpdateActions">
              {checkFailed ? <button type="button" className="appUpdateButton secondary" onClick={handleModalClose}>Close</button> : null}
              <button type="button" className="appUpdateButton primary" onClick={checkFailed ? fetchUpdateInfo : handleModalClose} disabled={checking}>
                {checkFailed ? <><RefreshCw size={16} /> Try again</> : checking ? "Checking…" : "Done"}
              </button>
            </div>
          </main>
        )}

        <footer className="appUpdateFooter"><CheckCircle2 size={14} /><span>Your information stays safe while the app updates.</span></footer>
      </section>
    </div>
  );
}

