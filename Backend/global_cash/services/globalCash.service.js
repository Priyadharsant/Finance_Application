export async function getAvailableCapital(client) {
  const query = `
    SELECT 
      COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END), 0) AS available_capital
    FROM global_cash_ledger;
  `;
  const res = await client.query(query);
  return parseFloat(res.rows[0].available_capital);
}

export async function createLedgerEntry(client, data) {
  const {
    effectiveDate,
    type,
    amount,
    direction,
    sourceModule,
    referenceType,
    referenceId,
    notes
  } = data;

  if (amount <= 0) {
    throw new Error('Ledger entry amount must be greater than 0');
  }

  const query = `
    INSERT INTO global_cash_ledger (
      effective_date, type, amount, direction, source_module, reference_type, reference_id, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;

  const values = [
    effectiveDate || new Date().toISOString().slice(0, 10),
    type,
    amount,
    direction,
    sourceModule,
    referenceType || null,
    referenceId || null,
    notes || null
  ];

  const res = await client.query(query, values);
  return res.rows[0];
}

export async function validateAndDisburseFunds(client, data) {
  const { module, amount, effectiveDate, referenceType, referenceId, notes } = data;

  if (amount <= 0) {
    throw new Error('Disbursement amount must be greater than 0');
  }

  // Calculate Available Capital
  const availableCapital = await getAvailableCapital(client);

  if (amount > availableCapital) {
    throw new Error(`Insufficient Funds. Available: ${availableCapital}, Requested: ${amount}`);
  }

  // Create Disbursement Ledger Entry
  const ledgerType = module === 'AUTO' ? 'AUTO_LOAN_DISBURSEMENT' : 'DAILY_LOAN_DISBURSEMENT';

  return await createLedgerEntry(client, {
    effectiveDate: effectiveDate || new Date().toISOString().slice(0, 10),
    type: ledgerType,
    amount: amount,
    direction: 'DEBIT',
    sourceModule: module,
    referenceType: referenceType,
    referenceId: referenceId,
    notes: notes
  });
}
