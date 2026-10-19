import express from 'express';
import {
  performHourlyBackup,
  getLatestBackupMetadata,
  listHourlyBackups,
  getBackupFilePath,
} from '../services/backupService.js';

const router = express.Router();

/**
 * GET /api/backup/status
 * Returns current status, metadata, and 3-day retention statistics
 */
router.get('/status', (req, res) => {
  const metadata = getLatestBackupMetadata();
  res.json({
    service: 'Database Hourly Backup Service (3-Day Rolling Ring)',
    schedule: 'Every 1 hour (0 * * * *)',
    retention: '72 hours (3 full days of individual hourly backups)',
    ...metadata,
  });
});

/**
 * GET /api/backup/list
 * Returns list of all available hourly backups from the last 3 days
 */
router.get('/list', (req, res) => {
  const backups = listHourlyBackups();
  res.json({
    totalAvailable: backups.length,
    retentionDays: 3,
    backups,
  });
});

/**
 * GET /api/backup/latest
 * Downloads the latest compressed backup file (.sql.gz)
 */
router.get('/latest', (req, res) => {
  const filePath = getBackupFilePath('latest_backup.sql.gz');
  if (!filePath) {
    return res.status(404).json({
      error: 'No backup file available yet. Backups run every hour, or you can trigger one with POST /api/backup/run-now.',
    });
  }

  res.setHeader('Content-Type', 'application/gzip');
  res.setHeader('Content-Disposition', 'attachment; filename="latest_backup.sql.gz"');
  res.sendFile(filePath);
});

/**
 * GET /api/backup/download/:filename
 * Downloads any specific hourly backup file from the 3-day history
 */
router.get('/download/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = getBackupFilePath(filename);
  if (!filePath) {
    return res.status(404).json({
      error: `Backup file '${filename}' not found or has been pruned after 3 days.`,
    });
  }

  res.setHeader('Content-Type', 'application/gzip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.sendFile(filePath);
});

/**
 * POST /api/backup/run-now
 * Immediately triggers a full database backup and sync
 */
router.post('/run-now', async (req, res) => {
  try {
    const result = await performHourlyBackup();
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    res.json({
      message: 'Database backup completed and added to 3-day rolling history.',
      ...result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
