import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import { Pool } from 'pg';
import { createDailyFinanceRouter, createSimpleFinanceRouter } from '../daily_finance/index.js';
import authRoutes from '../autoFinance/routes/authRoutes.js';
import customerRoutes from '../autoFinance/routes/customerRoutes.js';
import loanTypeRoutes from '../autoFinance/routes/loanTypeRoutes.js';
import loanRoutes from '../autoFinance/routes/loanRoutes.js';
import globalCashRoutes from '../global_cash/routes/globalCash.routes.js';
import { initMonthlyClosingCron } from '../global_cash/services/monthlyClosingCron.service.js';
const app=express();
const db=new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});
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
const allowedOrigin=process.env.FRONTEND_ORIGIN||'http://localhost:5173';
app.use((req,res,next)=>{const origin=req.headers.origin;if(!origin||origin===allowedOrigin)res.setHeader('Access-Control-Allow-Origin',allowedOrigin);res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,PATCH,OPTIONS');if(req.method==='OPTIONS')return res.sendStatus(204);next();});
app.use('/api/daily-finance',createDailyFinanceRouter(db));
app.use('/api/daily-finance',createSimpleFinanceRouter(db));

// autoFinance unified routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/loan-types', loanTypeRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/global-cash', globalCashRoutes);
app.use((error,req,res,next)=>{console.error(error);res.status(500).json({error:'Internal server error'});});
app.listen(Number(process.env.API_PORT||3000),()=>{
  console.log('Daily Finance API running');
  initMonthlyClosingCron();
});
