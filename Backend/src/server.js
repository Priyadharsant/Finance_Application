import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import { pool as db } from '../autoFinance/config/db.js';
import { createDailyFinanceRouter, createSimpleFinanceRouter } from '../daily_finance/index.js';
import authRoutes from '../autoFinance/routes/authRoutes.js';
import customerRoutes from '../autoFinance/routes/customerRoutes.js';
import loanTypeRoutes from '../autoFinance/routes/loanTypeRoutes.js';
import loanRoutes from '../autoFinance/routes/loanRoutes.js';
import globalCashRoutes from '../global_cash/routes/globalCash.routes.js';
import { initMonthlyClosingCron } from '../global_cash/services/monthlyClosingCron.service.js';
import versionRoutes from './routes/versionRoutes.js';
import appAuthRoutes from './routes/appAuthRoutes.js';
import tableEditorRoutes from './routes/tableEditorRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import backupRoutes from './routes/backupRoutes.js';
import { initHourlyBackupCron } from './services/backupService.js';

const app = express();
app.use(express.json({limit:'1mb'}));
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // set to true if using https
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));
// Global CORS configuration
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, *'
  );
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  );

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
// Health and liveness endpoints for Render and uptime monitoring
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// Root informational endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'KAMBAM FINANCE Backend API',
    status: 'online',
    health: '/health',
    version: '2.2.0',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/daily-finance',createDailyFinanceRouter(db));
app.use('/api/daily-finance',createSimpleFinanceRouter(db));

// autoFinance unified routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/loan-types', loanTypeRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/global-cash', globalCashRoutes);
app.use('/api/version', versionRoutes);
app.use('/api/app-auth', appAuthRoutes);
app.use('/api/table-editor', tableEditorRoutes);
app.use('/api/backup', backupRoutes);
app.use((error,req,res,next)=>{console.error(error);res.status(500).json({error:'Internal server error'});});
app.listen(Number(process.env.API_PORT||3000),()=>{
  console.log('Daily Finance API running');
  initMonthlyClosingCron();
  initHourlyBackupCron();
});

