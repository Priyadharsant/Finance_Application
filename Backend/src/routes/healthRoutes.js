import express from 'express';
import { pool as db } from '../../autoFinance/config/db.js';

const router = express.Router();

router.all('/', async (req, res) => {
  const startTime = Date.now();
  let dbStatus = 'connected';
  let dbLatencyMs = null;
  let dbError = null;

  try {
    const t0 = Date.now();
    await db.query('SELECT 1');
    dbLatencyMs = Date.now() - t0;
  } catch (err) {
    dbStatus = 'disconnected';
    dbError = err.message;
  }

  const isHealthy = dbStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'KAMBAM FINANCE Backend API',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      ...(dbError ? { error: dbError } : {}),
    },
    responseTimeMs: Date.now() - startTime,
  });
});

export default router;
