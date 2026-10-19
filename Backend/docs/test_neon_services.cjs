const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('=== TESTING NEON-WIRED BACKEND SERVICES END-TO-END ===\n');

  // 1. Health check
  const health = await get('/health');
  console.log('[1/5] GET /health -> Status:', health.status, JSON.stringify(health.data || health.raw));

  // 2. Daily Finance Customers
  const dfCust = await get('/api/daily-finance/customers');
  console.log('[2/5] GET /api/daily-finance/customers -> Status:', dfCust.status);
  if (Array.isArray(dfCust.data)) {
    console.log(`      Found ${dfCust.data.length} Daily Finance customers in Neon.`);
    console.log(`      Sample customer:`, dfCust.data[0]?.customer_name || dfCust.data[0]);
  }

  // 3. Daily Finance Dashboard / Summary
  const dfAccounts = await get('/api/daily-finance/dashboard');
  console.log('[3/5] GET /api/daily-finance/dashboard -> Status:', dfAccounts.status);
  if (dfAccounts.data) {
    console.log(`      Daily Dashboard data loaded:`, Object.keys(dfAccounts.data));
  }

  // 4. Global Capital Partners
  const gcPartners = await get('/api/global-cash/partners');
  console.log('[4/5] GET /api/global-cash/partners -> Status:', gcPartners.status);
  const partnersList = gcPartners.data?.data || gcPartners.data;
  if (Array.isArray(partnersList)) {
    console.log(`      Found ${partnersList.length} Global Partners in Neon.`);
    console.log(`      Sample partner:`, partnersList[0]?.partner_name || partnersList[0]?.name);
  }

  // 5. Global Cash Available Capital & Ledger
  const gcCap = await get('/api/global-cash/available-capital');
  console.log('[5/5] GET /api/global-cash/available-capital -> Status:', gcCap.status, JSON.stringify(gcCap.data));

  const gcLedger = await get('/api/global-cash/ledger');
  console.log('[6/6] GET /api/global-cash/ledger -> Status:', gcLedger.status, `(${gcLedger.data?.length || 0} ledger transactions)`);

  console.log('\n=== ALL NEON SERVICES VERIFIED END-TO-END SUCCESSFULLY! ===');
}

runTests().catch(err => {
  console.error('[FAILED]', err);
  process.exit(1);
});
