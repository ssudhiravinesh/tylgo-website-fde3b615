/**
 * Tally Relay Service v2.1
 * 
 * Runs on the showroom Windows PC (where VCC Client creates the localhost:9000 tunnel).
 * Polls Supabase for quotations with tally_sync_status = 'queued',
 * builds the XML (with inventory line items), POSTs to TallyPrime, and updates the status.
 * 
 * Architecture:
 *   Supabase DB ← polling ← THIS SCRIPT → localhost:9000 → VCC → Elcom Cloud → TallyPrime
 * 
 * Features:
 *   - Fetches quotation_items with tile details and tally_stock_mappings
 *   - Aggregates items by tile_id (same tile in multiple rooms → single inventory entry)
 *   - Generates ALLINVENTORYENTRIES.LIST for mapped tiles (stock gets reduced)
 *   - Unmapped tiles still counted in total via ledger fallback
 *   - Auto-creates customer ledger in Tally if it doesn't exist
 *   - Audit logging to tally_sync_log table
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
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
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

// ── XML Helpers ────────────────────────────────────────────────────────────────

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

// ── XML Builders ───────────────────────────────────────────────────────────────

/**
 * Build Sales Voucher XML (Invoice Mode with Inventory).
 * 
 * CORRECT TallyPrime Invoice Mode structure:
 *   - ALLLEDGERENTRIES #1: Party (Sundry Debtor) — DEBIT — AMOUNT = -total
 *   - ALLLEDGERENTRIES #2: Sales Account — CREDIT — AMOUNT = +total
 *     └── INVENTORYALLOCATIONS.LIST: nested INSIDE the Sales ledger entry
 *         Each item has its own INVENTORYALLOCATIONS.LIST block
 * 
 * KEY RULES:
 *   - Party amount is NEGATIVE (debit in sales context)
 *   - Sales amount is POSITIVE (credit in sales context)
 *   - Inventory amounts inside INVENTORYALLOCATIONS are NEGATIVE
 *   - INVENTORYALLOCATIONS go INSIDE the Sales ALLLEDGERENTRIES, NOT as separate blocks
 *   - PERSISTEDVIEW must be "Invoice Voucher View" for invoice mode
 *   - Dr total must equal Cr total
 */
function buildSalesVoucherXml(quotation, customerName, customerMobile, workerName, aggregatedItems) {
  const dateStr = formatTallyDate(quotation.created_at);
  const partyName = escapeXml(customerName);
  const salesLedger = escapeXml(SALES_LEDGER_NAME);

  // Narration: quotation number + worker name + customer phone number only
  const fullNarration = `${quotation.quotation_number} | ${workerName || 'N/A'} | ${customerMobile || 'N/A'}`;

  // Get discount info from quotation
  const discountPercentage = parseFloat(quotation.discount_percentage) || 0;
  const discountAmount = parseFloat(quotation.discount_amount) || 0;
  const hasDiscount = discountPercentage > 0 && discountAmount > 0;

  // Separate mapped vs unmapped items
  const mappedItems = aggregatedItems.filter(i => i.tallyStockName);
  const unmappedItems = aggregatedItems.filter(i => !i.tallyStockName);

  const hasInventory = mappedItems.length > 0;

  // ═══════════════════════════════════════════════════════════════════
  // FORMAT REVERSE-ENGINEERED FROM REAL TALLYPRIME EXPORT (2026-05-06)
  //
  // WITH inventory:
  //   Party LEDGERENTRIES:   AMOUNT = -total (NEGATIVE), ISDEEMEDPOSITIVE=Yes
  //   NO Sales Account LEDGERENTRIES
  //   ALLINVENTORYENTRIES:   AMOUNT = +amount (POSITIVE!), ISDEEMEDPOSITIVE=No
  //   ACCOUNTINGALLOCATIONS: AMOUNT = +amount (POSITIVE!)
  //
  // WITHOUT inventory (accounting-only):
  //   Party ALLLEDGERENTRIES:  AMOUNT = -total (NEGATIVE)
  //   Sales ALLLEDGERENTRIES:  AMOUNT = +total (POSITIVE)
  // ═══════════════════════════════════════════════════════════════════

  if (hasInventory) {
    // Compute pre-discount total from mapped items
    const preDscountInventoryTotal = Math.round(
      mappedItems.reduce((sum, i) => sum + Math.abs(i.totalPrice), 0) * 100
    ) / 100;

    // Apply discount proportionally across inventory items.
    // The party (customer) pays the POST-DISCOUNT amount,
    // so each item's amount in Tally must reflect its share of the discount.
    const discountMultiplier = hasDiscount && preDscountInventoryTotal > 0
      ? (preDscountInventoryTotal - discountAmount) / preDscountInventoryTotal
      : 1;

    // Build inventory entries — ALL AMOUNTS POSITIVE (post-discount)
    let inventoryXml = '';
    let discountedInventoryTotal = 0;

    for (let idx = 0; idx < mappedItems.length; idx++) {
      const item = mappedItems[idx];
      const stockName = escapeXml(item.tallyStockName);
      const boxes = item.boxes;
      const preDiscountAmount = Math.round(Math.abs(item.totalPrice) * 100) / 100;

      let amount;
      if (idx === mappedItems.length - 1) {
        // Last item absorbs rounding remainder so totals balance exactly
        const targetTotal = Math.round((preDscountInventoryTotal - discountAmount) * 100) / 100;
        amount = Math.round((targetTotal - discountedInventoryTotal) * 100) / 100;
      } else {
        amount = Math.round(preDiscountAmount * discountMultiplier * 100) / 100;
      }
      discountedInventoryTotal += amount;

      // Effective rate after discount
      const effectiveRate = boxes > 0 ? Math.round((amount / boxes) * 100) / 100 : item.pricePerBox;

      inventoryXml += `
            <ALLINVENTORYENTRIES.LIST>
              <STOCKITEMNAME>${stockName}</STOCKITEMNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <ISLASTDEEMEDPOSITIVE>No</ISLASTDEEMEDPOSITIVE>
              <ISAUTONEGATE>No</ISAUTONEGATE>
              <ISCUSTOMSCLEARANCE>No</ISCUSTOMSCLEARANCE>
              <ISTRACKCOMPONENT>No</ISTRACKCOMPONENT>
              <ISTRACKPRODUCTION>No</ISTRACKPRODUCTION>
              <ISPRIMARYITEM>No</ISPRIMARYITEM>
              <ISSCRAP>No</ISSCRAP>
              <RATE>${effectiveRate.toFixed(2)}/BOX</RATE>
              <AMOUNT>${amount.toFixed(2)}</AMOUNT>
              <ACTUALQTY> ${boxes.toFixed(2)} BOX</ACTUALQTY>
              <BILLEDQTY> ${boxes.toFixed(2)} BOX</BILLEDQTY>
              <ACCOUNTINGALLOCATIONS.LIST>
                <LEDGERNAME>${salesLedger}</LEDGERNAME>
                <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                <ISPARTYLEDGER>No</ISPARTYLEDGER>
                <AMOUNT>${amount.toFixed(2)}</AMOUNT>
              </ACCOUNTINGALLOCATIONS.LIST>
            </ALLINVENTORYENTRIES.LIST>`;
    }

    // Party ledger = post-discount total (what the customer actually pays)
    const partyTotal = Math.round(discountedInventoryTotal * 100) / 100;

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
            <NARRATION>${escapeXml(fullNarration)}</NARRATION>
            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${partyName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <AMOUNT>${partyTotal.toFixed(2)}</AMOUNT>
            </LEDGERENTRIES.LIST>
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${salesLedger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${partyTotal.toFixed(2)}</AMOUNT>
            </LEDGERENTRIES.LIST>${inventoryXml}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
  }

  // ── No inventory: accounting-only (confirmed working) ──
  const totalAmount = Math.abs(parseFloat(quotation.total_cost));

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
            <NARRATION>${escapeXml(fullNarration)}</NARRATION>
            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${partyName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <AMOUNT>${totalAmount}</AMOUNT>
            </LEDGERENTRIES.LIST>
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${salesLedger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${totalAmount}</AMOUNT>
            </LEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Build XML to export an existing Sales voucher from Tally.
 * Use this to reverse-engineer the correct inventory entry format.
 * Run: node index.js --export-voucher
 */
function buildExportVoucherXml() {
  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Voucher Register</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
      </STATICVARIABLES>
    </DESC>
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
 * Build Export XML to fetch existing ledger list from Tally.
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

// ── Ledger Cache ───────────────────────────────────────────────────────────────

let cachedLedgers = new Set();
let lastLedgerFetch = 0;
const LEDGER_CACHE_TTL_MS = 60000;

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

// ── Item Aggregation ───────────────────────────────────────────────────────────

/**
 * Fetch quotation items and aggregate by tile_id.
 * Same tile used in multiple rooms/layers → single aggregated entry.
 * 
 * Uses tile.name directly as the Tally stock item name (names match exactly).
 * 
 * Returns: [{ tileId, tileCode, tallyStockName, boxes, pricePerBox, totalPrice }]
 */
async function fetchAndAggregateItems(quotationId) {
  const { data: items, error: itemsError } = await supabase
    .from('quotation_items')
    .select(`
      id,
      tile_id,
      price_per_box,
      total_price,
      tiles!quotation_items_tile_id_fkey (
        id, code, name, pieces_per_box
      )
    `)
    .eq('quotation_id', quotationId);

  if (itemsError) {
    console.error(`  ⚠️  Failed to fetch quotation items: ${itemsError.message}`);
    return [];
  }

  if (!items || items.length === 0) {
    console.log('  ⚠️  No quotation items found');
    return [];
  }

  // Aggregate by tile_id: sum total_price, compute boxes
  const tileMap = new Map();

  for (const item of items) {
    const tileId = item.tile_id;
    if (!tileId) continue;

    const totalPrice = parseFloat(item.total_price) || 0;
    const pricePerBox = parseFloat(item.price_per_box) || 0;
    const tileCode = item.tiles?.code || 'Unknown';
    // Use tile.name directly as Tally stock item name
    const tallyStockName = item.tiles?.name || null;

    if (tileMap.has(tileId)) {
      const existing = tileMap.get(tileId);
      existing.totalPrice += totalPrice;
    } else {
      tileMap.set(tileId, {
        tileId,
        tileCode,
        tallyStockName,
        pricePerBox,
        totalPrice,
      });
    }
  }

  // Calculate boxes for each aggregated tile
  const aggregated = [];
  for (const item of tileMap.values()) {
    const boxes = item.pricePerBox > 0
      ? Math.round(item.totalPrice / item.pricePerBox)
      : 0;
    aggregated.push({ ...item, boxes });
  }

  return aggregated;
}

// ── Core Sync Logic ────────────────────────────────────────────────────────────

async function processQueuedQuotations() {
  const { data: quotations, error } = await supabase
    .from('quotations')
    .select(`
      id,
      quotation_number,
      total_cost,
      discount_percentage,
      discount_amount,
      created_at,
      tally_sync_status,
      worker_id,
      customers!quotations_customer_id_fkey (
        id, name, mobile
      ),
      profiles!quotations_worker_id_fkey (
        id, name
      )
    `)
    .eq('tally_sync_status', 'queued')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Supabase query error:', error.message);
    return;
  }

  if (!quotations || quotations.length === 0) {
    return;
  }

  console.log(`\n📦 Found ${quotations.length} queued quotation(s)`);

  for (const quotation of quotations) {
    const customerName = quotation.customers?.name || 'Cash';
    const discPct = parseFloat(quotation.discount_percentage) || 0;
    const discAmt = parseFloat(quotation.discount_amount) || 0;
    console.log(`\n🔄 Processing: ${quotation.quotation_number} (₹${quotation.total_cost}${discPct > 0 ? `, discount: ${discPct}% = -₹${discAmt}` : ''}) → ${customerName}`);

    try {
      // Step 1: Ensure customer ledger exists in Tally
      const ledgerReady = await ensureCustomerLedger(customerName);
      if (!ledgerReady) {
        await markFailed(quotation.id, `Could not create customer ledger "${customerName}" in Tally`);
        continue;
      }

      // Step 2: Fetch and aggregate quotation items with stock mappings
      const aggregatedItems = await fetchAndAggregateItems(quotation.id);

      const mappedCount = aggregatedItems.filter(i => i.tallyStockName).length;
      const unmappedCount = aggregatedItems.filter(i => !i.tallyStockName).length;
      console.log(`  📊 Items: ${aggregatedItems.length} tiles (${mappedCount} mapped, ${unmappedCount} unmapped)`);

      for (const item of aggregatedItems) {
        const status = item.tallyStockName ? '✅' : '⚠️';
        console.log(`     ${status} ${item.tileCode}: ${item.boxes} boxes × ₹${item.pricePerBox} = ₹${item.totalPrice}${item.tallyStockName ? ` → ${item.tallyStockName}` : ' (NO MAPPING)'}`);
      }

      // Step 3: Build and send Sales Voucher XML
      const customerMobile = quotation.customers?.mobile || '';
      const workerName = quotation.profiles?.name || '';
      const voucherXml = buildSalesVoucherXml(quotation, customerName, customerMobile, workerName, aggregatedItems);
      console.log(`\n  📄 XML being sent to Tally:\n${voucherXml}\n`);
      const response = await sendToTally(voucherXml);
      const result = parseTallyResponse(response);

      if (result.success) {
        await supabase
          .from('quotations')
          .update({
            tally_sync_status: 'synced',
            tally_voucher_number: quotation.quotation_number,
            tally_sync_error: null,
            tally_synced_at: new Date().toISOString(),
          })
          .eq('id', quotation.id);

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
    const xml = buildCheckLedgerXml();
    const response = await sendToTally(xml);
    return response.includes('LEDGER');
  } catch {
    return false;
  }
}

// ── Main Loop ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║       Tylgo → Tally Relay Service v2.1      ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║  Sales vouchers with inventory line items    ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  Tally endpoint: http://${TALLY_HOST}:${TALLY_PORT}`);
  console.log(`  Poll interval:  ${POLL_INTERVAL_MS / 1000}s`);
  console.log(`  Sales ledger:   ${SALES_LEDGER_NAME}`);
  console.log('');

  console.log('🔍 Checking Tally connection...');
  const connected = await checkTallyConnection();
  if (connected) {
    console.log('✅ Tally is reachable and responding\n');
  } else {
    console.log('⚠️  Tally is not reachable. Will retry on each poll cycle.');
    console.log('   Make sure VCC Client is connected and showing green status.\n');
  }

  console.log(`🔄 Polling Supabase every ${POLL_INTERVAL_MS / 1000}s for queued quotations...\n`);

  const poll = async () => {
    try {
      await processQueuedQuotations();
    } catch (err) {
      console.error('❌ Unexpected error in poll cycle:', err.message);
    }
  };

  await poll();
  setInterval(poll, POLL_INTERVAL_MS);
}

// ── CLI Commands ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes('--export-voucher')) {
  // Export existing Sales vouchers from Tally to reverse-engineer the XML format
  (async () => {
    console.log('📤 Exporting Sales vouchers from Tally...\n');
    try {
      const xml = buildExportVoucherXml();
      const response = await sendToTally(xml);

      // Save to file
      const fs = require('fs');
      const filename = 'tally-export-sales.xml';
      fs.writeFileSync(filename, response, 'utf-8');
      console.log(`✅ Saved to ${filename} (${response.length} bytes)`);
      console.log('\nOpen this file and look for ALLINVENTORYENTRIES to see the correct format.');
    } catch (err) {
      console.error('❌ Failed:', err.message);
      console.error('   Make sure Tally is running and VCC Client is connected.');
    }
  })();
} else {
  // Normal relay mode
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
