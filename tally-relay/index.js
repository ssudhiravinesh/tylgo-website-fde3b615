/**
 * Tally Relay Service
 * 
 * Runs on the showroom Windows PC (where VCC Client creates the localhost:9000 tunnel).
 * Polls Supabase for quotations with tally_sync_status = 'queued',
 * builds the XML, POSTs to TallyPrime, and updates the status.
 * 
 * Architecture:
 *   Supabase DB ← polling ← THIS SCRIPT → localhost:9000 → VCC → Elcom Cloud → TallyPrime
 * 
 * Usage:
 *   1. Copy .env.example to .env and fill in Supabase credentials
 *   2. npm install
 *   3. npm start
 */

const { createClient } = require('@supabase/supabase-js');
const http = require('http');

// ── Configuration ──────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Service role key for server-side access
const TALLY_HOST = process.env.TALLY_HOST || 'localhost';
const TALLY_PORT = parseInt(process.env.TALLY_PORT || '9000', 10);
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '5000', 10);
const SALES_LEDGER_NAME = process.env.SALES_LEDGER_NAME || 'Sales Account';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment.');
  console.error('   Copy .env.example to .env and fill in your credentials.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── XML Builders ───────────────────────────────────────────────────────────────

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatTallyDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Build Sales Voucher XML from a quotation.
 * For now, uses simple accounting mode (no inventory entries).
 * Inventory mode will be added once stock mappings are configured.
 */
function buildSalesVoucherXml(quotation, customerName) {
  const dateStr = formatTallyDate(quotation.created_at);
  const partyName = escapeXml(customerName);
  const salesLedger = escapeXml(SALES_LEDGER_NAME);
  const totalAmount = Math.abs(quotation.total_cost);
  const narration = `Tylgo Quotation #${quotation.quotation_number}`;

  return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales" ACTION="Create">
            <DATE>${dateStr}</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <ISINVOICE>Yes</ISINVOICE>
            <VOUCHERNUMBER>${escapeXml(quotation.quotation_number)}</VOUCHERNUMBER>
            <NARRATION>${escapeXml(narration)}</NARRATION>
            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${partyName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>${totalAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${salesLedger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${-totalAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Build Create Ledger XML for auto-creating customer party ledgers.
 */
function buildCreateLedgerXml(name) {
  const escapedName = escapeXml(name);
  return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${escapedName}" Action="Create">
            <NAME>${escapedName}</NAME>
            <PARENT>Sundry Debtors</PARENT>
            <OPENINGBALANCE>0</OPENINGBALANCE>
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Build Export XML to check if a ledger already exists.
 */
function buildCheckLedgerXml() {
  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>COLLECTION</TYPE>
    <ID>List of Ledgers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;
}

// ── HTTP Client for Tally ──────────────────────────────────────────────────────

function sendToTally(xmlBody) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: TALLY_HOST,
      port: TALLY_PORT,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'Content-Length': Buffer.byteLength(xmlBody, 'utf-8'),
      },
      timeout: 30000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Tally request timed out (30s)'));
    });

    req.write(xmlBody);
    req.end();
  });
}

// ── Response Parser ────────────────────────────────────────────────────────────

function parseTallyResponse(xml) {
  const getTag = (tag) => {
    const match = xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
    return match ? match[1].trim() : null;
  };

  const created = parseInt(getTag('CREATED') || '0', 10);
  const errors = parseInt(getTag('ERRORS') || '0', 10);
  const lastVchId = parseInt(getTag('LASTVCHID') || '0', 10);
  const lineError = getTag('LINEERROR');

  return {
    success: errors === 0 && created > 0,
    created,
    errors,
    lastVchId,
    lineError,
    raw: xml,
  };
}

// ── Existing Ledger Cache ──────────────────────────────────────────────────────

let cachedLedgers = new Set();
let lastLedgerFetch = 0;
const LEDGER_CACHE_TTL_MS = 60000; // 1 minute

async function getExistingLedgers() {
  const now = Date.now();
  if (cachedLedgers.size > 0 && (now - lastLedgerFetch) < LEDGER_CACHE_TTL_MS) {
    return cachedLedgers;
  }

  try {
    const xml = buildCheckLedgerXml();
    const response = await sendToTally(xml);
    const matches = response.match(/LEDGER NAME="([^"]+)"/g);
    if (matches) {
      cachedLedgers = new Set(matches.map(m => m.replace('LEDGER NAME="', '').replace('"', '')));
    }
    lastLedgerFetch = now;
  } catch (err) {
    console.warn('⚠️  Could not fetch ledger list from Tally:', err.message);
  }

  return cachedLedgers;
}

async function ensureCustomerLedger(customerName) {
  const ledgers = await getExistingLedgers();
  if (ledgers.has(customerName)) {
    return true;
  }

  console.log(`  📋 Creating customer ledger: "${customerName}"`);
  try {
    const xml = buildCreateLedgerXml(customerName);
    const response = await sendToTally(xml);
    const result = parseTallyResponse(response);
    if (result.success) {
      cachedLedgers.add(customerName);
      console.log(`  ✅ Ledger "${customerName}" created`);
      return true;
    } else {
      console.error(`  ❌ Failed to create ledger: ${result.lineError || result.raw}`);
      return false;
    }
  } catch (err) {
    console.error(`  ❌ Error creating ledger: ${err.message}`);
    return false;
  }
}

// ── Core Sync Logic ────────────────────────────────────────────────────────────

async function processQueuedQuotations() {
  // Fetch all quotations with tally_sync_status = 'queued'
  const { data: quotations, error } = await supabase
    .from('quotations')
    .select(`
      id,
      quotation_number,
      total_cost,
      created_at,
      tally_sync_status,
      customers!quotations_customer_id_fkey (
        id, name, mobile
      )
    `)
    .eq('tally_sync_status', 'queued')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Supabase query error:', error.message);
    return;
  }

  if (!quotations || quotations.length === 0) {
    return; // Nothing to process
  }

  console.log(`\n📦 Found ${quotations.length} queued quotation(s)`);

  for (const quotation of quotations) {
    const customerName = quotation.customers?.name || 'Cash';
    console.log(`\n🔄 Processing: ${quotation.quotation_number} (₹${quotation.total_cost}) → ${customerName}`);

    try {
      // Step 1: Ensure customer ledger exists in Tally
      const ledgerReady = await ensureCustomerLedger(customerName);
      if (!ledgerReady) {
        await markFailed(quotation.id, `Could not create customer ledger "${customerName}" in Tally`);
        continue;
      }

      // Step 2: Build and send Sales Voucher XML
      const voucherXml = buildSalesVoucherXml(quotation, customerName);
      const response = await sendToTally(voucherXml);
      const result = parseTallyResponse(response);

      if (result.success) {
        // Step 3: Mark as synced in Supabase
        await supabase
          .from('quotations')
          .update({
            tally_sync_status: 'synced',
            tally_voucher_number: quotation.quotation_number,
            tally_sync_error: null,
            tally_synced_at: new Date().toISOString(),
          })
          .eq('id', quotation.id);

        // Log success
        await logSync('voucher_push', 'success', 1, null, voucherXml, response);

        console.log(`  ✅ Synced! Voucher ID: ${result.lastVchId}`);
      } else {
        const errorMsg = result.lineError || `Tally returned ${result.errors} error(s)`;
        await markFailed(quotation.id, errorMsg);
        await logSync('voucher_push', 'failure', 0, errorMsg, voucherXml, response);
        console.error(`  ❌ Tally rejected: ${errorMsg}`);
      }
    } catch (err) {
      const errorMsg = `Connection error: ${err.message}`;
      await markFailed(quotation.id, errorMsg);
      await logSync('voucher_push', 'failure', 0, errorMsg, null, null);
      console.error(`  ❌ ${errorMsg}`);
    }
  }
}

async function markFailed(quotationId, errorMessage) {
  await supabase
    .from('quotations')
    .update({
      tally_sync_status: 'failed',
      tally_sync_error: errorMessage,
    })
    .eq('id', quotationId);
}

async function logSync(syncType, status, recordsProcessed, errorMessage, requestPayload, responsePayload) {
  try {
    await supabase
      .from('tally_sync_log')
      .insert({
        sync_type: syncType,
        status,
        records_processed: recordsProcessed,
        error_message: errorMessage,
        raw_request_payload: requestPayload ? requestPayload.substring(0, 5000) : null,
        raw_response_payload: responsePayload ? responsePayload.substring(0, 5000) : null,
      });
  } catch (err) {
    console.warn('⚠️  Could not write to sync log:', err.message);
  }
}

// ── Health Check ───────────────────────────────────────────────────────────────

async function checkTallyConnection() {
  try {
    const xml = `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>EXPORT</TALLYREQUEST><TYPE>COLLECTION</TYPE><ID>List of Ledgers</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></DESC></BODY></ENVELOPE>`;
    const response = await sendToTally(xml);
    return response.includes('<STATUS>1</STATUS>');
  } catch {
    return false;
  }
}

// ── Main Loop ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║       Tylgo → Tally Relay Service v1.0      ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  Tally endpoint: http://${TALLY_HOST}:${TALLY_PORT}`);
  console.log(`  Poll interval:  ${POLL_INTERVAL_MS / 1000}s`);
  console.log(`  Sales ledger:   ${SALES_LEDGER_NAME}`);
  console.log('');

  // Initial connection check
  console.log('🔍 Checking Tally connection...');
  const connected = await checkTallyConnection();
  if (connected) {
    console.log('✅ Tally is reachable and responding\n');
  } else {
    console.log('⚠️  Tally is not reachable. Will retry on each poll cycle.');
    console.log('   Make sure VCC Client is connected and showing green status.\n');
  }

  // Start polling
  console.log(`🔄 Polling Supabase every ${POLL_INTERVAL_MS / 1000}s for queued quotations...\n`);

  const poll = async () => {
    try {
      await processQueuedQuotations();
    } catch (err) {
      console.error('❌ Unexpected error in poll cycle:', err.message);
    }
  };

  // Run immediately, then on interval
  await poll();
  setInterval(poll, POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
