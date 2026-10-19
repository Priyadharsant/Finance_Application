import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Retention: 3 days of hourly backups = 72 hours
const RETENTION_HOURS = 72;
const MAX_BACKUP_AGE_MS = RETENTION_HOURS * 60 * 60 * 1000;

// Local backup storage folder: Backend/backups
const BACKUP_DIR = path.resolve(__dirname, '../../backups');
const HOURLY_DIR = path.join(BACKUP_DIR, 'hourly');
const LATEST_BACKUP_FILE = path.join(BACKUP_DIR, 'latest_backup.sql.gz');

let latestBackupMetadata = {
  lastRunTime: null,
  status: 'initialized',
  filename: null,
  fileSizeBytes: 0,
  fileSizeFormatted: '0 B',
  cloudUploaded: false,
  cloudStoragePath: null,
  cloudError: null,
  retentionHours: RETENTION_HOURS,
};

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function ensureDirectories() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  if (!fs.existsSync(HOURLY_DIR)) {
    fs.mkdirSync(HOURLY_DIR, { recursive: true });
  }
}

function getSupabaseClient() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_KEY ||
    ''
  ).trim();

  if (!url || !key) return null;
  try {
    return createClient(url, key, { auth: { persistSession: false } });
  } catch (err) {
    console.warn('[BackupService] Could not init Supabase client:', err.message);
    return null;
  }
}

/**
 * Upload backup files to Cloud Storage:
 * 1. Overwrites database-backups/latest_backup.sql.gz (instant pointer)
 * 2. Saves to database-backups/hourly/<filename> (preserved in the 3-day ring)
 */
async function uploadToCloudStorage(filePath, filename) {
  const client = getSupabaseClient();
  if (!client) {
    return { uploaded: false, error: 'Cloud storage credentials not configured' };
  }

  const bucket = (process.env.SUPABASE_BUCKET || 'Finance App').trim();
  const latestPath = 'database-backups/latest_backup.sql.gz';
  const hourlyPath = `database-backups/hourly/${filename}`;

  try {
    const fileBuffer = fs.readFileSync(filePath);

    // 1. Upload/update the latest backup pointer
    await client.storage.from(bucket).upload(latestPath, fileBuffer, {
      contentType: 'application/gzip',
      upsert: true,
    });

    // 2. Upload to 3-day hourly rolling slot
    const { error: hourlyError } = await client.storage
      .from(bucket)
      .upload(hourlyPath, fileBuffer, {
        contentType: 'application/gzip',
        upsert: true,
      });

    if (hourlyError) {
      console.warn('[BackupService] Hourly cloud slot upload notice:', hourlyError.message);
      return { uploaded: false, error: hourlyError.message };
    }

    // 3. Prune cloud backups older than 3 days
    pruneCloudBackups(client, bucket).catch((e) =>
      console.warn('[BackupService] Cloud prune notice:', e.message)
    );

    console.log(`[BackupService] Successfully uploaded to Cloud Storage: ${bucket}/${hourlyPath}`);
    return { uploaded: true, cloudStoragePath: `${bucket}/${hourlyPath}` };
  } catch (err) {
    console.warn('[BackupService] Cloud upload exception:', err.message);
    return { uploaded: false, error: err.message };
  }
}

/**
 * Prunes cloud backups older than 72 hours (3 days)
 */
async function pruneCloudBackups(client, bucket) {
  try {
    const { data: files, error } = await client.storage
      .from(bucket)
      .list('database-backups/hourly', { limit: 100 });

    if (error || !files) return;

    const cutoff = Date.now() - MAX_BACKUP_AGE_MS;
    const toRemove = [];

    for (const f of files) {
      if (f.name.startsWith('backup_') && f.name.endsWith('.sql.gz')) {
        const fileTime = new Date(f.created_at || f.updated_at).getTime();
        if (fileTime && fileTime < cutoff) {
          toRemove.push(`database-backups/hourly/${f.name}`);
        }
      }
    }

    if (toRemove.length > 0) {
      await client.storage.from(bucket).remove(toRemove);
      console.log(`[BackupService] Pruned ${toRemove.length} expired backups (>3 days) from Cloud Storage.`);
    }
  } catch (err) {
    console.warn('[BackupService] Cloud prune error:', err.message);
  }
}

/**
 * Performs a full database dump, compresses it, stores in 3-day rolling hourly ring, and syncs to cloud storage.
 */
export async function performHourlyBackup() {
  ensureDirectories();

  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    const msg = 'No database connection string configured for backup.';
    console.error(`[BackupService] ${msg}`);
    latestBackupMetadata.status = 'failed';
    latestBackupMetadata.cloudError = msg;
    return { success: false, error: msg };
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const hourlyFilename = `backup_${timestamp}.sql.gz`;
  const hourlyFilePath = path.join(HOURLY_DIR, hourlyFilename);
  const tempFilePath = path.join(BACKUP_DIR, `temp_${Date.now()}.sql.gz`);

  console.log(`[BackupService] Running hourly backup for ${now.toISOString()} (3-day rolling window)...`);

  return new Promise((resolve) => {
    // pg_dump with -Z 6 gzip compression level
    const cmd = `pg_dump -d "${connectionString}" -Z 6 -f "${tempFilePath}"`;

    exec(cmd, { maxBuffer: 1024 * 1024 * 50 }, async (err, stdout, stderr) => {
      if (err) {
        console.error('[BackupService] pg_dump execution failed:', err.message);
        if (fs.existsSync(tempFilePath)) {
          try { fs.unlinkSync(tempFilePath); } catch (_) {}
        }
        latestBackupMetadata.status = 'failed';
        latestBackupMetadata.cloudError = err.message;
        return resolve({ success: false, error: err.message });
      }

      try {
        // Save to 3-day hourly directory and update latest_backup.sql.gz
        fs.copyFileSync(tempFilePath, hourlyFilePath);
        fs.copyFileSync(tempFilePath, LATEST_BACKUP_FILE);
        fs.unlinkSync(tempFilePath);

        const stats = fs.statSync(LATEST_BACKUP_FILE);
        const sizeBytes = stats.size;
        const sizeFormatted = formatBytes(sizeBytes);

        // Upload to Cloud Storage (both latest pointer and 3-day hourly slot)
        const cloudResult = await uploadToCloudStorage(hourlyFilePath, hourlyFilename);

        latestBackupMetadata = {
          lastRunTime: now.toISOString(),
          status: 'success',
          filename: hourlyFilename,
          fileSizeBytes: sizeBytes,
          fileSizeFormatted: sizeFormatted,
          cloudUploaded: cloudResult.uploaded,
          cloudStoragePath: cloudResult.cloudStoragePath || null,
          cloudError: cloudResult.error || null,
          retentionHours: RETENTION_HOURS,
        };

        console.log(`[BackupService] Hourly backup saved: ${hourlyFilename} (${sizeFormatted})`);

        // Rotate local backups (remove backups older than 72 hours)
        rotateLocalBackups();

        return resolve({
          success: true,
          timestamp: now.toISOString(),
          filename: hourlyFilename,
          sizeBytes,
          sizeFormatted,
          cloudUploaded: cloudResult.uploaded,
        });
      } catch (postErr) {
        console.error('[BackupService] Post-dump processing error:', postErr.message);
        latestBackupMetadata.status = 'failed';
        latestBackupMetadata.cloudError = postErr.message;
        return resolve({ success: false, error: postErr.message });
      }
    });
  });
}

/**
 * Retains only the most recent 72 hourly backups (3 full days)
 */
function rotateLocalBackups() {
  try {
    ensureDirectories();
    const cutoff = Date.now() - MAX_BACKUP_AGE_MS;

    const files = fs
      .readdirSync(HOURLY_DIR)
      .filter((f) => f.startsWith('backup_') && f.endsWith('.sql.gz'))
      .map((f) => {
        const fullPath = path.join(HOURLY_DIR, f);
        return {
          name: f,
          path: fullPath,
          mtime: fs.statSync(fullPath).mtimeMs,
        };
      })
      .sort((a, b) => b.mtime - a.mtime); // newest first

    let prunedCount = 0;
    // 1. Delete by age (> 72 hours)
    for (const item of files) {
      if (item.mtime < cutoff) {
        try {
          fs.unlinkSync(item.path);
          prunedCount++;
        } catch (_) {}
      }
    }

    // 2. Safety cap: ensure no more than 72 files remain even if system clock adjusted
    const remaining = fs
      .readdirSync(HOURLY_DIR)
      .filter((f) => f.startsWith('backup_') && f.endsWith('.sql.gz'))
      .map((f) => ({
        name: f,
        path: path.join(HOURLY_DIR, f),
        mtime: fs.statSync(path.join(HOURLY_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (remaining.length > RETENTION_HOURS) {
      const extra = remaining.slice(RETENTION_HOURS);
      for (const item of extra) {
        try {
          fs.unlinkSync(item.path);
          prunedCount++;
        } catch (_) {}
      }
    }

    if (prunedCount > 0) {
      console.log(`[BackupService] Rotated ${prunedCount} expired local backups (>3 days).`);
    }
  } catch (err) {
    console.warn('[BackupService] Backup rotation notice:', err.message);
  }
}

/**
 * Returns a list of all available hourly backups from the 3-day retention ring
 */
export function listHourlyBackups() {
  ensureDirectories();
  try {
    return fs
      .readdirSync(HOURLY_DIR)
      .filter((f) => f.startsWith('backup_') && f.endsWith('.sql.gz'))
      .map((f) => {
        const fullPath = path.join(HOURLY_DIR, f);
        const stats = fs.statSync(fullPath);
        return {
          filename: f,
          sizeBytes: stats.size,
          sizeFormatted: formatBytes(stats.size),
          createdAt: stats.mtime.toISOString(),
          downloadUrl: `/api/backup/download/${encodeURIComponent(f)}`,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (err) {
    console.warn('[BackupService] Could not list hourly backups:', err.message);
    return [];
  }
}

/**
 * Resolves a specific backup file path safely
 */
export function getBackupFilePath(filename) {
  if (!filename) return null;
  const safeName = path.basename(filename);
  if (safeName === 'latest_backup.sql.gz') {
    return fs.existsSync(LATEST_BACKUP_FILE) ? LATEST_BACKUP_FILE : null;
  }
  const hourlyPath = path.join(HOURLY_DIR, safeName);
  return fs.existsSync(hourlyPath) ? hourlyPath : null;
}

/**
 * Returns metadata of the latest backup and overview of the 3-day ring
 */
export function getLatestBackupMetadata() {
  ensureDirectories();
  const availableBackups = listHourlyBackups();

  if (fs.existsSync(LATEST_BACKUP_FILE)) {
    try {
      const stats = fs.statSync(LATEST_BACKUP_FILE);
      return {
        ...latestBackupMetadata,
        retentionDays: 3,
        retentionHours: RETENTION_HOURS,
        totalBackupsStored: availableBackups.length,
        fileSizeBytes: stats.size,
        fileSizeFormatted: formatBytes(stats.size),
        latestFileExists: true,
        modifiedAt: stats.mtime.toISOString(),
        downloadPath: '/api/backup/latest',
      };
    } catch (_) {}
  }

  return {
    ...latestBackupMetadata,
    retentionDays: 3,
    retentionHours: RETENTION_HOURS,
    totalBackupsStored: availableBackups.length,
    latestFileExists: false,
    downloadPath: '/api/backup/latest',
  };
}

/**
 * Initializes the automated 1-hour recurring cron schedule (0 * * * *)
 */
export function initHourlyBackupCron() {
  ensureDirectories();

  // Run at minute 0 of every hour: '0 * * * *'
  cron.schedule('0 * * * *', async () => {
    console.log('[BackupCron] Triggering scheduled 1-hour database backup (3-day rolling ring)...');
    try {
      await performHourlyBackup();
    } catch (err) {
      console.error('[BackupCron] Hourly backup task error:', err.message);
    }
  });

  console.log(`[BackupCron] Automated hourly backup scheduled: every 1 hour, retained for ${RETENTION_HOURS} hours (3 days).`);

  // Trigger an initial backup on startup after 8 seconds so latest and hourly slot are immediately populated
  setTimeout(() => {
    console.log('[BackupCron] Running initial startup database backup...');
    performHourlyBackup().catch((err) => {
      console.warn('[BackupCron] Initial startup backup notice:', err.message);
    });
  }, 8000);
}
