import express from 'express';
import { pool } from '../../autoFinance/config/db.js';
import { getAvailableCapital } from '../services/globalCash.service.js';
import { createContribution, getPartnerCurrentCapital } from '../services/partnerCapital.service.js';
import { createDraftMonthlyClosing, finalizeMonthlyClosing } from '../services/monthlyClosing.service.js';

const router = express.Router();

// --- DASHBOARD & LEDGER ---
router.get('/ledger', async (req, res) => {
  try {
    const availableCapital = await getAvailableCapital(pool);
    const ledgerRes = await pool.query('SELECT * FROM global_cash_ledger ORDER BY transaction_date DESC LIMIT 100');
    
    res.json({
      availableCapital,
      ledger: ledgerRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PARTNERS ---
router.get('/partners', async (req, res) => {
  try {
    const partnersRes = await pool.query('SELECT * FROM global_partners ORDER BY created_at ASC');
    const partners = partnersRes.rows;

    // Attach current capital
    for (const p of partners) {
      p.current_capital = await getPartnerCurrentCapital(pool, p.id);
    }

    res.json(partners);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/partners', async (req, res) => {
  try {
    const { name } = req.body;
    const insertRes = await pool.query(`INSERT INTO global_partners (name) VALUES ($1) RETURNING *`, [name]);
    res.json(insertRes.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PARTNER TRANSACTIONS ---
router.get('/partner-transactions', async (req, res) => {
  try {
    const txRes = await pool.query(`
      SELECT t.*, p.name as partner_name 
      FROM partner_capital_transactions t
      JOIN global_partners p ON t.partner_id = p.id
      ORDER BY effective_date DESC, transaction_timestamp DESC
      LIMIT 100
    `);
    res.json(txRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/partner-transactions/contribution', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { partnerId, amount, effectiveDate, notes } = req.body;
    
    const tx = await createContribution(client, partnerId, amount, effectiveDate, notes);
    
    await client.query('COMMIT');
    res.json(tx);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// --- MONTHLY CLOSINGS ---
router.get('/monthly-closings', async (req, res) => {
  try {
    const closingsRes = await pool.query('SELECT * FROM monthly_closings ORDER BY period_label DESC');
    res.json(closingsRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/monthly-closings/draft', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { year, month } = req.body;
    
    const draft = await createDraftMonthlyClosing(client, year, month);
    
    // Fetch detailed allocations for the response
    const allocRes = await client.query(`
      SELECT a.*, p.name as partner_name
      FROM partner_monthly_allocations a
      JOIN global_partners p ON a.partner_id = p.id
      WHERE a.closing_id = $1
    `, [draft.id]);
    
    await client.query('COMMIT');
    res.json({ closing: draft, allocations: allocRes.rows });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.post('/monthly-closings/:id/finalize', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { manualAdjustment, adjustmentReason } = req.body;
    
    const finalized = await finalizeMonthlyClosing(client, req.params.id, manualAdjustment, adjustmentReason);
    
    await client.query('COMMIT');
    res.json(finalized);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Fetch draft allocations
router.get('/monthly-closings/:id/allocations', async (req, res) => {
  try {
    const allocRes = await pool.query(`
      SELECT a.*, p.name as partner_name
      FROM partner_monthly_allocations a
      JOIN global_partners p ON a.partner_id = p.id
      WHERE a.closing_id = $1
    `, [req.params.id]);
    res.json(allocRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
