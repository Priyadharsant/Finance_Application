const { Client } = require("pg");

async function main() {
  const client = new Client({ user: "postgres", password: "hari4274", database: "finance", port: 5432 });
  await client.connect();
  console.log("Connected. Clearing all data...");

  // Disable FK checks temporarily using TRUNCATE CASCADE
  await client.query("TRUNCATE TABLE autofinance_customer_documents CASCADE");
  await client.query("TRUNCATE TABLE autofinance_payment_allocations CASCADE");
  await client.query("TRUNCATE TABLE autofinance_payments CASCADE");
  await client.query("TRUNCATE TABLE autofinance_emi_schedules CASCADE");
  await client.query("TRUNCATE TABLE autofinance_expenses CASCADE");
  await client.query("TRUNCATE TABLE autofinance_penalties CASCADE");
  await client.query("TRUNCATE TABLE autofinance_loans CASCADE");
  await client.query("TRUNCATE TABLE autofinance_vehicles CASCADE");
  await client.query("TRUNCATE TABLE autofinance_customers CASCADE");
  await client.query("TRUNCATE TABLE daily_finance_payments CASCADE");
  await client.query("TRUNCATE TABLE daily_finance_daily_closings CASCADE");
  await client.query("TRUNCATE TABLE daily_finance_historical_collections CASCADE");
  await client.query("TRUNCATE TABLE daily_finance_accounts CASCADE");
  await client.query("TRUNCATE TABLE daily_finance_expenses CASCADE");
  await client.query("TRUNCATE TABLE daily_finance_audit_logs CASCADE");
  await client.query("TRUNCATE TABLE daily_finance_customers CASCADE");
  await client.query("TRUNCATE TABLE daily_finance_capital_transactions CASCADE");
  await client.query("TRUNCATE TABLE partner_profit_allocations CASCADE");
  await client.query("TRUNCATE TABLE partner_monthly_allocations CASCADE");
  await client.query("TRUNCATE TABLE partner_profit_calculations CASCADE");
  await client.query("TRUNCATE TABLE partner_profit_payments CASCADE");
  await client.query("TRUNCATE TABLE partner_exit_requests CASCADE");
  await client.query("TRUNCATE TABLE partner_capital_transactions CASCADE");
  await client.query("TRUNCATE TABLE daily_profit_logs CASCADE");
  await client.query("TRUNCATE TABLE global_partners CASCADE");
  await client.query("TRUNCATE TABLE global_cash_ledger CASCADE");
  await client.query("TRUNCATE TABLE expenses CASCADE");
  await client.query("TRUNCATE TABLE customer_documents CASCADE");
  await client.query("TRUNCATE TABLE customers CASCADE");
  console.log("All data cleared!");

  // ============ INSERT CLEAN TEST DATA ============

  // 1. Partners
  const partner1 = await client.query(
    "INSERT INTO global_partners (name, phone, email, notes, status, join_date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
    ["Rajan Kumar", "9876543210", "rajan@example.com", "Main investor", "ACTIVE", "2026-07-01"]
  );
  const partner2 = await client.query(
    "INSERT INTO global_partners (name, phone, email, notes, status, join_date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
    ["Suresh Babu", "9876500001", "suresh@example.com", "Secondary partner", "ACTIVE", "2026-07-15"]
  );
  const p1Id = partner1.rows[0].id;
  const p2Id = partner2.rows[0].id;
  console.log("Partners created:", p1Id, p2Id);

  // 2. Global Cash Ledger - Initial capital from partners
  // Partner 1 contributes 1,50,000 (own money)
  await client.query(
    "INSERT INTO partner_capital_transactions (partner_id, transaction_type, amount, effective_date, status, notes, fund_source_type, lender_name, interest_rate) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    [p1Id, "CONTRIBUTION", 150000, "2026-07-01", "APPROVED", "Initial own capital", "OWN", null, 0]
  );
  await client.query(
    "INSERT INTO global_cash_ledger (transaction_type, amount, description, reference_type, reference_id, balance_after, transaction_date) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    ["CREDIT", 150000, "Partner contribution - Rajan Kumar", "PARTNER_CONTRIBUTION", p1Id, 150000, "2026-07-01"]
  );

  // Partner 2 contributes 80,000 (50k own + 30k borrowed from Murugan at 2% monthly)
  await client.query(
    "INSERT INTO partner_capital_transactions (partner_id, transaction_type, amount, effective_date, status, notes, fund_source_type, lender_name, interest_rate) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    [p2Id, "CONTRIBUTION", 50000, "2026-07-15", "APPROVED", "Own capital", "OWN", null, 0]
  );
  await client.query(
    "INSERT INTO global_cash_ledger (transaction_type, amount, description, reference_type, reference_id, balance_after, transaction_date) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    ["CREDIT", 50000, "Partner contribution - Suresh Babu (own)", "PARTNER_CONTRIBUTION", p2Id, 200000, "2026-07-15"]
  );
  await client.query(
    "INSERT INTO partner_capital_transactions (partner_id, transaction_type, amount, effective_date, status, notes, fund_source_type, lender_name, interest_rate) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    [p2Id, "CONTRIBUTION", 30000, "2026-07-20", "APPROVED", "Borrowed from Murugan", "LEND", "Murugan", 2.0]
  );
  await client.query(
    "INSERT INTO global_cash_ledger (transaction_type, amount, description, reference_type, reference_id, balance_after, transaction_date) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    ["CREDIT", 30000, "Partner contribution - Suresh Babu (borrowed from Murugan)", "PARTNER_CONTRIBUTION", p2Id, 230000, "2026-07-20"]
  );
  console.log("Capital seeded. Total: 2,30,000");

  // 3. Auto Finance - Customers
  const ac1 = await client.query(
    "INSERT INTO autofinance_customers (name, phone, address, aadhar_number, pan_number) VALUES ($1,$2,$3,$4,$5) RETURNING id",
    ["Karthik Raj", "9500001111", "12 Anna Nagar, Chennai", "1234-5678-9012", "ABCPK1234D"]
  );
  const ac2 = await client.query(
    "INSERT INTO autofinance_customers (name, phone, address, aadhar_number, pan_number) VALUES ($1,$2,$3,$4,$5) RETURNING id",
    ["Priya Devi", "9500002222", "5 Gandhi St, Coimbatore", "9876-5432-1098", "XYZPD5678F"]
  );
  const ac1Id = ac1.rows[0].id;
  const ac2Id = ac2.rows[0].id;
  console.log("Auto customers:", ac1Id, ac2Id);

  // 4. Auto Finance - Vehicles
  const v1 = await client.query(
    "INSERT INTO autofinance_vehicles (customer_id, vehicle_type, vehicle_number, model, make, year) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
    [ac1Id, "TWO_WHEELER", "TN09AB1234", "Splendor Plus", "Hero", 2023]
  );
  const v2 = await client.query(
    "INSERT INTO autofinance_vehicles (customer_id, vehicle_type, vehicle_number, model, make, year) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
    [ac2Id, "CAR", "TN11CD5678", "Swift Dzire", "Maruti", 2022]
  );
  const v1Id = v1.rows[0].id;
  const v2Id = v2.rows[0].id;
  console.log("Vehicles:", v1Id, v2Id);

  // 5. Auto Finance - Loans
  // Loan 1: Two-wheeler, OWN funds, 25000 principal, 6 months at 3% monthly
  const loan1 = await client.query(
    `INSERT INTO autofinance_loans 
      (customer_id, vehicle_id, loan_amount, interest_rate, tenure_months, emi_amount, start_date, status, 
       loan_type, fees_details, total_amount, outstanding_amount)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [
      ac1Id, v1Id, 25000, 3.0, 6, 4583, "2026-07-05", "ACTIVE",
      "TWO_WHEELER",
      JSON.stringify({ brokerName: "Ravi Broker", jaminName: "Selvam", fundSource: "OWN", partnerId: null, partnerInterestRate: 0 }),
      27500, 20834
    ]
  );
  const loan1Id = loan1.rows[0].id;

  // Loan 2: Car, Partner-funded, 80000 principal, 12 months at 2.5% monthly
  const loan2 = await client.query(
    `INSERT INTO autofinance_loans 
      (customer_id, vehicle_id, loan_amount, interest_rate, tenure_months, emi_amount, start_date, status, 
       loan_type, fees_details, total_amount, outstanding_amount)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [
      ac2Id, v2Id, 80000, 2.5, 12, 8667, "2026-07-20", "ACTIVE",
      "CAR",
      JSON.stringify({ brokerName: "Kumar Broker", jaminName: "Anand", fundSource: "PARTNER", partnerId: p1Id, partnerInterestRate: 1.5 }),
      96000, 70003
    ]
  );
  const loan2Id = loan2.rows[0].id;
  console.log("Auto loans:", loan1Id, loan2Id);

  // Debit global cash for loan disbursement
  await client.query(
    "INSERT INTO global_cash_ledger (transaction_type, amount, description, reference_type, reference_id, balance_after, transaction_date) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    ["DEBIT", 25000, "Loan disbursement - Karthik Raj TW Loan", "LOAN_DISBURSEMENT", loan1Id, 205000, "2026-07-05"]
  );
  await client.query(
    "INSERT INTO global_cash_ledger (transaction_type, amount, description, reference_type, reference_id, balance_after, transaction_date) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    ["DEBIT", 80000, "Loan disbursement - Priya Devi Car Loan", "LOAN_DISBURSEMENT", loan2Id, 125000, "2026-07-20"]
  );

  // 6. Auto Finance - EMI Payments (3 payments per loan)
  // Loan 1 payments (Aug, Sep, Oct 2026)
  for (let i = 0; i < 3; i++) {
    const payDate = new Date("2026-07-05");
    payDate.setMonth(payDate.getMonth() + i + 1);
    const dateStr = payDate.toISOString().split("T")[0];
    const principal = 3333;
    const interest = 1250;
    await client.query(
      `INSERT INTO autofinance_payments (loan_id, amount, payment_date, payment_type, principal_amount, interest_amount, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [loan1Id, 4583, dateStr, "EMI", principal, interest, "Monthly EMI payment", "COMPLETED"]
    );
    await client.query(
      "INSERT INTO global_cash_ledger (transaction_type, amount, description, reference_type, reference_id, balance_after, transaction_date) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      ["CREDIT", 4583, "EMI received - Loan "+loan1Id+" month "+(i+1), "EMI_PAYMENT", loan1Id, 125000+(i+1)*4583, dateStr]
    );
  }

  // Loan 2 payments (Aug, Sep 2026)
  for (let i = 0; i < 2; i++) {
    const payDate = new Date("2026-07-20");
    payDate.setMonth(payDate.getMonth() + i + 1);
    const dateStr = payDate.toISOString().split("T")[0];
    const principal = 4667;
    const interest = 2000;
    await client.query(
      `INSERT INTO autofinance_payments (loan_id, amount, payment_date, payment_type, principal_amount, interest_amount, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [loan2Id, 8667, dateStr, "EMI", principal, interest, "Monthly EMI payment", "COMPLETED"]
    );
    await client.query(
      "INSERT INTO global_cash_ledger (transaction_type, amount, description, reference_type, reference_id, balance_after, transaction_date) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      ["CREDIT", 8667, "EMI received - Loan "+loan2Id+" month "+(i+1), "EMI_PAYMENT", loan2Id, 134500+(i+1)*8667, dateStr]
    );
  }
  console.log("Auto payments inserted");

  // 7. Daily Finance - Customers
  const dc1 = await client.query(
    "INSERT INTO daily_finance_customers (name, phone, address, aadhar_number) VALUES ($1,$2,$3,$4) RETURNING id",
    ["Murugan Vel", "9700001111", "8 Market St, Madurai", "1111-2222-3333"]
  );
  const dc2 = await client.query(
    "INSERT INTO daily_finance_customers (name, phone, address, aadhar_number) VALUES ($1,$2,$3,$4) RETURNING id",
    ["Lakshmi Devi", "9700002222", "22 Temple Rd, Trichy", "4444-5555-6666"]
  );
  const dc3 = await client.query(
    "INSERT INTO daily_finance_customers (name, phone, address, aadhar_number) VALUES ($1,$2,$3,$4) RETURNING id",
    ["Senthil Kumar", "9700003333", "45 Cross St, Salem", "7777-8888-9999"]
  );
  const dc1Id = dc1.rows[0].id;
  const dc2Id = dc2.rows[0].id;
  const dc3Id = dc3.rows[0].id;
  console.log("Daily customers:", dc1Id, dc2Id, dc3Id);

  // 8. Daily Finance - Accounts (30-day cycles, small amounts)
  const da1 = await client.query(
    `INSERT INTO daily_finance_accounts 
      (customer_id, principal_amount, daily_collection, total_amount, days, start_date, end_date, status, amount_given, collected_amount, outstanding_amount)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [dc1Id, 5000, 200, 6000, 30, "2026-07-28", "2026-08-26", "ACTIVE", 5000, 4200, 1800]
  );
  const da2 = await client.query(
    `INSERT INTO daily_finance_accounts 
      (customer_id, principal_amount, daily_collection, total_amount, days, start_date, end_date, status, amount_given, collected_amount, outstanding_amount)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [dc2Id, 3000, 120, 3600, 30, "2026-08-01", "2026-08-31", "ACTIVE", 3000, 2400, 1200]
  );
  const da3 = await client.query(
    `INSERT INTO daily_finance_accounts 
      (customer_id, principal_amount, daily_collection, total_amount, days, start_date, end_date, status, amount_given, collected_amount, outstanding_amount)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [dc3Id, 8000, 320, 9600, 30, "2026-09-01", "2026-09-30", "CLOSED", 8000, 9600, 0]
  );
  const da1Id = da1.rows[0].id;
  const da2Id = da2.rows[0].id;
  const da3Id = da3.rows[0].id;
  console.log("Daily accounts:", da1Id, da2Id, da3Id);

  // Daily Finance - Disbursement from global cash
  await client.query(
    "INSERT INTO global_cash_ledger (transaction_type, amount, description, reference_type, reference_id, balance_after, transaction_date) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    ["DEBIT", 5000, "Daily finance disbursement - Murugan Vel", "DAILY_LOAN", da1Id, 120000, "2026-07-28"]
  );
  await client.query(
    "INSERT INTO global_cash_ledger (transaction_type, amount, description, reference_type, reference_id, balance_after, transaction_date) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    ["DEBIT", 3000, "Daily finance disbursement - Lakshmi Devi", "DAILY_LOAN", da2Id, 117000, "2026-08-01"]
  );
  await client.query(
    "INSERT INTO global_cash_ledger (transaction_type, amount, description, reference_type, reference_id, balance_after, transaction_date) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    ["DEBIT", 8000, "Daily finance disbursement - Senthil Kumar", "DAILY_LOAN", da3Id, 109000, "2026-09-01"]
  );

  // 9. Daily Finance - Payments
  // Account 1: 21 days of payments (200/day)
  for (let i = 0; i < 21; i++) {
    const pd = new Date("2026-07-29");
    pd.setDate(pd.getDate() + i);
    await client.query(
      "INSERT INTO daily_finance_payments (account_id, amount, payment_date, notes, status) VALUES ($1,$2,$3,$4,$5)",
      [da1Id, 200, pd.toISOString().split("T")[0], "Daily collection", "COMPLETED"]
    );
  }
  // Account 2: 20 days of payments (120/day)
  for (let i = 0; i < 20; i++) {
    const pd = new Date("2026-08-02");
    pd.setDate(pd.getDate() + i);
    await client.query(
      "INSERT INTO daily_finance_payments (account_id, amount, payment_date, notes, status) VALUES ($1,$2,$3,$4,$5)",
      [da2Id, 120, pd.toISOString().split("T")[0], "Daily collection", "COMPLETED"]
    );
  }
  // Account 3: 30 days of payments (closed - fully collected)
  for (let i = 0; i < 30; i++) {
    const pd = new Date("2026-09-02");
    pd.setDate(pd.getDate() + i);
    await client.query(
      "INSERT INTO daily_finance_payments (account_id, amount, payment_date, notes, status) VALUES ($1,$2,$3,$4,$5)",
      [da3Id, 320, pd.toISOString().split("T")[0], "Daily collection", "COMPLETED"]
    );
  }
  console.log("Daily payments inserted");

  await client.end();
  console.log("\n=== SEED COMPLETE! ===");
  console.log("Partners: 2 (Rajan Kumar, Suresh Babu)");
  console.log("Global Capital: Rs.2,30,000 (Rajan: 1.5L own | Suresh: 50k own + 30k borrowed from Murugan @ 2%/month)");
  console.log("Auto Loans: 2 (Karthik 25k TW | Priya 80k Car)");
  console.log("Auto Payments: 5 total (3 for TW, 2 for Car)");
  console.log("Daily Finance: 3 customers (Murugan 5k, Lakshmi 3k, Senthil 8k)");
  console.log("Daily Payments: 71 total (21+20+30)");
}

main().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
