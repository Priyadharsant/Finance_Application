import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  user: 'postgres',
  password: 'hari4274',
  host: 'localhost',
  port: 5432,
  database: 'finance'
});

async function seedData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Clearing existing data...');
    // Clear auto finance tables
    await client.query('TRUNCATE TABLE autofinance_payments CASCADE');
    await client.query('TRUNCATE TABLE autofinance_emi_schedules CASCADE');
    await client.query('TRUNCATE TABLE autofinance_vehicles CASCADE');
    await client.query('TRUNCATE TABLE autofinance_loans CASCADE');
    await client.query('TRUNCATE TABLE autofinance_customers CASCADE');

    // Clear daily finance tables
    await client.query('TRUNCATE TABLE daily_finance_payments CASCADE');
    await client.query('TRUNCATE TABLE daily_finance_accounts CASCADE');
    await client.query('TRUNCATE TABLE daily_finance_customers CASCADE');

    // Clear global cash / partners tables
    await client.query('TRUNCATE TABLE partner_capital_transactions CASCADE');
    await client.query('TRUNCATE TABLE global_cash_ledger CASCADE');
    await client.query('TRUNCATE TABLE global_partners CASCADE');
    await client.query('TRUNCATE TABLE expenses CASCADE');

    console.log('Inserting Partners...');
    // Insert Partners
    const partner1Res = await client.query(`
      INSERT INTO global_partners (name, phone, status)
      VALUES ('John Doe', '1234567890', 'ACTIVE')
      RETURNING id
    `);
    const p1Id = partner1Res.rows[0].id;

    const partner2Res = await client.query(`
      INSERT INTO global_partners (name, phone, status)
      VALUES ('Jane Smith', '0987654321', 'ACTIVE')
      RETURNING id
    `);
    const p2Id = partner2Res.rows[0].id;

    console.log('Inserting Partner Capital Transactions...');
    // Partner 1: Own Money
    await client.query(`
      INSERT INTO partner_capital_transactions (partner_id, transaction_type, amount, effective_date, status, fund_source_type)
      VALUES ($1, 'CONTRIBUTION', 500000, '2026-07-01', 'COMPLETED', 'OWN')
    `, [p1Id]);

    // Partner 2: Lend Money
    await client.query(`
      INSERT INTO partner_capital_transactions (partner_id, transaction_type, amount, effective_date, status, fund_source_type, lender_name, interest_rate)
      VALUES ($1, 'CONTRIBUTION', 300000, '2026-07-15', 'COMPLETED', 'LEND', 'External Lender Inc', 2.5)
    `, [p2Id]);

    // Update Global Cash Ledger
    await client.query(`
      INSERT INTO global_cash_ledger (type, amount, reference_id, reference_type, effective_date, direction, source_module)
      VALUES 
      ('PARTNER_CONTRIBUTION', 500000, $1, 'PARTNER_CAPITAL', '2026-07-01', 'CREDIT', 'GLOBAL_CASH'),
      ('PARTNER_CONTRIBUTION', 300000, $2, 'PARTNER_CAPITAL', '2026-07-15', 'CREDIT', 'GLOBAL_CASH')
    `, [p1Id, p2Id]);


    console.log('Inserting Auto Finance Data...');
    // Auto Finance Customer 1
    const ac1Res = await client.query(`
      INSERT INTO autofinance_customers (customer_code, first_name, last_name, phone, address, city)
      VALUES ('CUST-001', 'Alice', 'Brown', '1112223333', '123 Main St', 'CityA')
      RETURNING id
    `);
    const ac1Id = ac1Res.rows[0].id;

    const al1Res = await client.query(`
      INSERT INTO autofinance_loans (customer_id, loan_amount, interest_rate, tenure_months, start_date, end_date, status, fees_details)
      VALUES ($1, 50000, 1.5, 12, '2026-07-20', '2027-07-20', 'ACTIVE', '{"brokerName": "Broker X", "jaminName": "Jamin Y"}')
      RETURNING id
    `, [ac1Id]);
    const al1Id = al1Res.rows[0].id;
    
    const av1Res = await client.query(`
      INSERT INTO autofinance_vehicles (loan_id, make, model, year, registration_number)
      VALUES ($1, 'Honda', 'Civic', 2020, 'AB123CD')
      RETURNING id
    `, [al1Id]);
    const av1Id = av1Res.rows[0].id;

    // Auto Finance Payments
    const ap1Res = await client.query(`
      INSERT INTO autofinance_payments (loan_id, amount_paid, payment_date, payment_method, reference_number)
      VALUES ($1, 5000, '2026-08-20', 'CASH', 'REF-001')
      RETURNING id
    `, [al1Id]);
    const ap1Id = ap1Res.rows[0].id;

    // Auto Ledger Entries
    await client.query(`
      INSERT INTO global_cash_ledger (type, amount, reference_id, reference_type, effective_date, direction, source_module, notes)
      VALUES 
      ('AUTO_DISBURSEMENT', 50000, $1, 'AUTO_LOAN', '2026-07-20', 'DEBIT', 'AUTO_FINANCE', 'Auto Loan Disbursement'),
      ('AUTO_COLLECTION', 5000, $2, 'AUTO_PAYMENT', '2026-08-20', 'CREDIT', 'AUTO_FINANCE', 'Auto Loan Payment')
    `, [al1Id, ap1Id]);

    console.log('Inserting Daily Finance Data...');
    // Daily Finance Customer 1
    const dc1Res = await client.query(`
      INSERT INTO daily_finance_customers (customer_name, mobile_number, address, status)
      VALUES ('Bob White', '4445556666', '456 Side St', 'ACTIVE')
      RETURNING customer_id
    `);
    const dc1Id = dc1Res.rows[0].customer_id;

    const da1Res = await client.query(`
      INSERT INTO daily_finance_accounts (customer_id, finance_date, gross_finance_amount, daily_agreed_due, expected_collection_days, status, interest_type, interest_value, initial_deduction, agreed_total_payable, expected_completion_date)
      VALUES ($1, '2026-08-01', 10000, 100, 100, 'ACTIVE', 'PERCENT', 0, 0, 10000, '2026-11-09')
      RETURNING finance_id
    `, [dc1Id]);
    const da1Id = da1Res.rows[0].finance_id;

    // Daily Payments
    const dp1Res = await client.query(`
      INSERT INTO daily_finance_payments (customer_id, finance_id, amount, collection_date, payment_method)
      VALUES 
      ($2, $1, 100, '2026-08-02', 'CASH'),
      ($2, $1, 100, '2026-08-03', 'CASH')
      RETURNING payment_id
    `, [da1Id, dc1Id]);
    const dp1Id = dp1Res.rows[0].payment_id;
    const dp2Id = dp1Res.rows[1].payment_id;

    // Daily Ledger Entries
    await client.query(`
      INSERT INTO global_cash_ledger (type, amount, reference_id, reference_type, effective_date, direction, source_module, notes)
      VALUES 
      ('DAILY_DISBURSEMENT', 10000, $1, 'DAILY_ACCOUNT', '2026-08-01', 'DEBIT', 'DAILY_FINANCE', 'Daily Finance Disbursement'),
      ('DAILY_COLLECTION', 100, $2, 'DAILY_PAYMENT', '2026-08-02', 'CREDIT', 'DAILY_FINANCE', 'Daily Finance Collection'),
      ('DAILY_COLLECTION', 100, $3, 'DAILY_PAYMENT', '2026-08-03', 'CREDIT', 'DAILY_FINANCE', 'Daily Finance Collection')
    `, [da1Id, dp1Id, dp2Id]);

    await client.query('COMMIT');
    console.log('Test data seeded successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding data:', error);
  } finally {
    client.release();
    pool.end();
  }
}

seedData();
