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

  const fullNarration = `${quotation.quotation_number} | ${workerName || 'N/A'} | ${customerMobile || 'N/A'}`;

  const discountPercentage = parseFloat(quotation.discount_percentage) || 0;
  const discountAmount = parseFloat(quotation.discount_amount) || 0;
  const hasDiscount = discountPercentage > 0 && discountAmount > 0;

  const mappedItems = aggregatedItems.filter(i => i.tallyStockName);
  const hasInventory = mappedItems.length > 0;

  // ═══════════════════════════════════════════════════════════════════
  // STRUCTURE CONFIRMED FROM TALLY EXPORT (tally-export-sales.xml, 2026-05-16)
  //
  // Item Invoice mode (with inventory):
  //   VOUCHER tag: OBJVIEW="Invoice Voucher View"
  //   PERSISTEDVIEW, VCHENTRYMODE=Item Invoice
  //   ALLINVENTORYENTRIES.LIST FIRST (before LEDGERENTRIES):
  //     AMOUNT = +item (POSITIVE), ISDEEMEDPOSITIVE=No
  //     ACCOUNTINGALLOCATIONS: LEDGERNAME, AMOUNT=+item (POSITIVE), ISLASTDEEMEDPOSITIVE=No
  //   LEDGERENTRIES.LIST (party only, NO separate Sales Account entry):
  //     ISDEEMEDPOSITIVE=Yes, ISPARTYLEDGER=Yes, ISLASTDEEMEDPOSITIVE=Yes
  //     AMOUNT = -total (NEGATIVE)
  //
  // Accounting-only mode (no inventory):
  //   LEDGERENTRIES.LIST party: AMOUNT=+total (POSITIVE), ISDEEMEDPOSITIVE=Yes
  //   LEDGERENTRIES.LIST sales: AMOUNT=-total (NEGATIVE), ISDEEMEDPOSITIVE=No
  // ═══════════════════════════════════════════════════════════════════

  if (hasInventory) {
    const preDiscountInventoryTotal = Math.round(
      mappedItems.reduce((sum, i) => sum + Math.abs(i.totalPrice), 0) * 100
    ) / 100;

    const discountMultiplier = hasDiscount && preDiscountInventoryTotal > 0
      ? (preDiscountInventoryTotal - discountAmount) / preDiscountInventoryTotal
      : 1;

    let inventoryXml = '';
    let discountedInventoryTotal = 0;

    for (let idx = 0; idx < mappedItems.length; idx++) {
      const item = mappedItems[idx];
      const stockName = escapeXml(item.tallyStockName);
      const boxes = item.boxes;
      const preDiscountAmount = Math.round(Math.abs(item.totalPrice) * 100) / 100;

      let amount;
      if (idx === mappedItems.length - 1) {
        const targetTotal = Math.round((preDiscountInventoryTotal - discountAmount) * 100) / 100;
        amount = Math.round((targetTotal - discountedInventoryTotal) * 100) / 100;
      } else {
        amount = Math.round(preDiscountAmount * discountMultiplier * 100) / 100;
      }
      discountedInventoryTotal += amount;
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
              <RATE>${effectiveRate.toFixed(2)}/${item.unit}</RATE>
              <AMOUNT>${amount.toFixed(2)}</AMOUNT>
              <ACTUALQTY> ${boxes.toFixed(2)} ${item.unit}</ACTUALQTY>
              <BILLEDQTY> ${boxes.toFixed(2)} ${item.unit}</BILLEDQTY>
              <ACCOUNTINGALLOCATIONS.LIST>
                <LEDGERNAME>${salesLedger}</LEDGERNAME>
                <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                <ISPARTYLEDGER>No</ISPARTYLEDGER>
                <ISLASTDEEMEDPOSITIVE>No</ISLASTDEEMEDPOSITIVE>
                <AMOUNT>${amount.toFixed(2)}</AMOUNT>
              </ACCOUNTINGALLOCATIONS.LIST>
            </ALLINVENTORYENTRIES.LIST>`;
    }

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
          <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">
            <DATE>${dateStr}</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
            <VCHENTRYMODE>Item Invoice</VCHENTRYMODE>
            <ISINVOICE>Yes</ISINVOICE>
            <VOUCHERNUMBER>${escapeXml(quotation.quotation_number)}</VOUCHERNUMBER>
            <NARRATION>${escapeXml(fullNarration)}</NARRATION>
            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>${inventoryXml}
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${partyName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <ISLASTDEEMEDPOSITIVE>Yes</ISLASTDEEMEDPOSITIVE>
              <AMOUNT>-${partyTotal.toFixed(2)}</AMOUNT>
            </LEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
  }

  // Accounting-only (no inventory) — confirmed from Tally export
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
              <ISLASTDEEMEDPOSITIVE>Yes</ISLASTDEEMEDPOSITIVE>
              <AMOUNT>${totalAmount.toFixed(2)}</AMOUNT>
            </LEDGERENTRIES.LIST>
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${salesLedger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <ISLASTDEEMEDPOSITIVE>No</ISLASTDEEMEDPOSITIVE>
              <AMOUNT>-${totalAmount.toFixed(2)}</AMOUNT>
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
 * Priority for Tally Stock Name:
 * 1. Explicit mapping in tally_stock_mappings table
 * 2. Reconstructed name: tile.code (dashes to spaces) + PRE suffix from tile.name
 * 3. Fallback: tile.name
 * 
 * Returns: [{ tileId, tileCode, tallyStockName, boxes, pricePerBox, totalPrice }]
 */
async function fetchAndAggregateItems(quotationId) {
  const { data: items, error: itemsError } = await supabase
    .from('quotation_items')
    .select(`
      id,
      tile_id,
      product_id,
      price_per_box,
      total_price,
      quantity,
      tiles!quotation_items_tile_id_fkey (
        id, 
        code, 
        name, 
        pieces_per_box,
        tally_stock_mappings (
          tally_stock_item_name
        )
      ),
      products:product_id (
        id,
        name,
        tally_stock_mappings (
          tally_stock_item_name
        )
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

  // Aggregate by unique key (tile_id or product_id)
  const itemMap = new Map();

  for (const item of items) {
    const isTile = !!item.tile_id;
    const itemId = isTile ? item.tile_id : item.product_id;
    if (!itemId) continue;

    const totalPrice = parseFloat(item.total_price) || 0;
    const pricePerBox = parseFloat(item.price_per_box) || 0;
    const quantity = parseFloat(item.quantity) || 0;
    
    // Determine Tally Stock Name
    let tallyStockName = null;
    let displayName = 'Unknown';
    let unit = 'BOX';

    if (isTile) {
      const tileCode = item.tiles?.code || 'Unknown';
      const tileName = item.tiles?.name || '';
      displayName = tileCode;
      
      // Priority 1: Explicit mapping
      if (item.tiles?.tally_stock_mappings && item.tiles.tally_stock_mappings.length > 0) {
        tallyStockName = item.tiles.tally_stock_mappings[0].tally_stock_item_name;
      } 
      
      // Priority 2: Reconstructed (e.g. "JF-1200X600-PGVT-24001" + "PRE 2T" -> "JF 1200X600 PGVT 24001 PRE 2T")
      if (!tallyStockName) {
        const preMatch = tileName.match(/(PRE\s+\d+T.*)$/i);
        if (tileCode && tileCode !== 'Unknown' && preMatch) {
          const cleanCode = tileCode.replace(/-/g, ' '); 
          tallyStockName = `${cleanCode} ${preMatch[1]}`;
        }
      }

      // Priority 3: Use tile name directly
      if (!tallyStockName) {
        tallyStockName = tileName || null;
      }
    } else {
      // It's a non-tile product (Basin, sink, etc.)
      const productName = item.products?.name || 'Unknown Product';
      displayName = productName;
      unit = 'Nos'; // Non-tile products usually use Nos in Tally

      // Priority 1: Explicit mapping
      if (item.products?.tally_stock_mappings && item.products.tally_stock_mappings.length > 0) {
        tallyStockName = item.products.tally_stock_mappings[0].tally_stock_item_name;
      }

      // Priority 2: Direct name match (Products in Tally usually match Tylgo names exactly)
      if (!tallyStockName) {
        tallyStockName = productName;
      }
    }

    if (itemMap.has(itemId)) {
      const existing = itemMap.get(itemId);
      existing.totalPrice += totalPrice;
      existing.quantity += quantity;
    } else {
      itemMap.set(itemId, {
        id: itemId,
        isTile,
        displayName,
        tallyStockName,
        pricePerBox,
        totalPrice,
        quantity,
        unit
      });
    }
  }

  // Calculate units (boxes/nos) for each aggregated item
  const aggregated = [];
  for (const item of itemMap.values()) {
    let boxes = 0;
    if (item.isTile) {
      boxes = item.pricePerBox > 0 ? Math.round(item.totalPrice / item.pricePerBox) : 0;
    } else {
      boxes = item.quantity;
    }
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
        console.log(`     ${status} ${item.displayName}: ${item.boxes} ${item.unit} × ₹${item.pricePerBox} = ₹${item.totalPrice}${item.tallyStockName ? ` → ${item.tallyStockName}` : ' (NO MAPPING)'}`);
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

// ── Stock Balance Sync (Tally → Supabase) ─────────────────────────────────────

/**
 * Build XML to export stock item closing balances from Tally.
 * Uses TDL COLLECTION to fetch NAME and CLOSINGBALANCE for all stock items.
 */
function buildStockBalanceExportXml() {
  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>COLLECTION</TYPE>
    <ID>Stock Item Balance</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="Stock Item Balance" ISMODIFY="No">
            <TYPE>StockItem</TYPE>
            <FETCH>NAME, CLOSINGBALANCE</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;
}

/**
 * Parse Tally's stock balance export response.
 * Extracts { stockItemName, closingBalance } from each STOCKITEM block.
 */
function parseStockBalanceResponse(xml) {
  const results = [];
  const stockItemRegex = /<STOCKITEM[^>]*?NAME="([^"]*)"[^>]*>([\s\S]*?)<\/STOCKITEM>/gi;
  let match;

  while ((match = stockItemRegex.exec(xml)) !== null) {
    const name = match[1];
    const block = match[2];

    const balanceMatch = block.match(/<CLOSINGBALANCE>([\s\S]*?)<\/CLOSINGBALANCE>/i);
    let closingBalance = 0;

    if (balanceMatch) {
      // Tally may return values like "150.00 Nos" or "150.00 Box" — extract the number
      const numericPart = balanceMatch[1].trim().replace(/[^0-9.\-]/g, '');
      const parsed = parseFloat(numericPart);
      if (!isNaN(parsed)) {
        closingBalance = parsed;
      }
    }

    results.push({ stockItemName: name, closingBalance });
  }

  return results;
}

/**
 * Process pending stock_pull requests from tally_sync_log.
 * 1. Fetch pending stock_pull entries
 * 2. Query Tally for all stock item closing balances
 * 3. Look up tally_stock_mappings to match stock items → tiles
 * 4. Only update tiles where the stock quantity has actually changed
 * 5. Update sync log status
 */
async function processStockPullRequests() {
  const { data: pendingRequests, error } = await supabase
    .from('tally_sync_log')
    .select('id, brand_id')
    .eq('sync_type', 'stock_pull')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    console.error('❌ Error fetching stock_pull requests:', error.message);
    return;
  }

  if (!pendingRequests || pendingRequests.length === 0) {
    return;
  }

  const request = pendingRequests[0];
  console.log(`\n📊 Processing stock_pull request: ${request.id}`);

  try {
    // Step 1: Fetch closing balances from Tally
    console.log('  🔄 Fetching stock balances from Tally...');
    const xml = buildStockBalanceExportXml();
    const response = await sendToTally(xml);
    const stockBalances = parseStockBalanceResponse(response);
    console.log(`  📦 Received ${stockBalances.length} stock items from Tally`);

    if (stockBalances.length === 0) {
      await supabase.from('tally_sync_log').update({
        status: 'failure',
        error_message: 'Tally returned 0 stock items — check if the company is loaded',
        raw_response_payload: response.substring(0, 5000),
      }).eq('id', request.id);
      console.error('  ❌ No stock items returned from Tally');
      return;
    }

    // Step 2: Fetch all stock mappings from Supabase
    const { data: mappings, error: mappingError } = await supabase
      .from('tally_stock_mappings')
      .select('tile_id, tally_stock_item_name');

    if (mappingError) {
      throw new Error(`Failed to fetch stock mappings: ${mappingError.message}`);
    }

    console.log(`  🔍 Loaded ${mappings?.length || 0} stock mappings from Supabase`);

    // Create a lookup: tally_stock_item_name → tile_id
    const nameToTileId = new Map();
    for (const m of mappings) {
      if (m.tally_stock_item_name) {
        nameToTileId.set(m.tally_stock_item_name.trim().toUpperCase(), m.tile_id);
      }
    }

    // Step 3: Fetch current stock quantities for mapped tiles
    const mappedTileIds = [...new Set(mappings.map(m => m.tile_id).filter(Boolean))];
    console.log(`  🔍 Mapped tile IDs count: ${mappedTileIds.length}`);

    const { data: currentTiles, error: tilesError } = await supabase
      .from('tiles')
      .select('id, code, stock_quantity')
      .in('id', mappedTileIds);

    if (tilesError) {
      throw new Error(`Failed to fetch current tile data: ${tilesError.message}`);
    }

    console.log(`  🔍 Loaded ${currentTiles?.length || 0} tiles from Supabase`);

    const currentStockMap = new Map();
    const tileCodeMap = new Map();
    for (const t of currentTiles) {
      currentStockMap.set(t.id, parseFloat(t.stock_quantity) || 0);
      tileCodeMap.set(t.id, t.code);
    }

    // Step 4: Compare and update only changed tiles
    let updatedCount = 0;
    let skippedCount = 0;
    const now = new Date().toISOString();

    for (const balance of stockBalances) {
      const upperName = balance.stockItemName.trim().toUpperCase();
      const tileId = nameToTileId.get(upperName);
      if (!tileId) {
        console.log(`  ℹ️ No mapping for Tally item: "${balance.stockItemName}"`);
        continue; 
      }

      const currentQty = currentStockMap.get(tileId) ?? 0;
      const newQty = balance.closingBalance;

      if (currentQty === newQty) {
        skippedCount++;
        continue;
      }

      const tileCode = tileCodeMap.get(tileId) || 'unknown';
      console.log(`  📝 ${tileCode}: ${currentQty} → ${newQty}`);

      const { error: updateError } = await supabase
        .from('tiles')
        .update({ stock_quantity: newQty, last_stock_sync: now })
        .eq('id', tileId);

      if (updateError) {
        console.error(`  ⚠️  Failed to update ${tileCode}: ${updateError.message}`);
      } else {
        updatedCount++;
      }
    }

    // Step 5: Update sync log
    await supabase.from('tally_sync_log').update({
      status: 'success',
      records_processed: updatedCount,
      raw_request_payload: xml.substring(0, 5000),
      raw_response_payload: response.substring(0, 5000),
    }).eq('id', request.id);

    console.log(`  ✅ Stock sync complete: ${updatedCount} updated, ${skippedCount} unchanged`);

  } catch (err) {
    const errorMsg = `Stock sync error: ${err.message}`;
    await supabase.from('tally_sync_log').update({
      status: 'failure',
      error_message: errorMsg,
    }).eq('id', request.id);
    console.error(`  ❌ ${errorMsg}`);
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

  console.log(`🔄 Polling Supabase every ${POLL_INTERVAL_MS / 1000}s for queued quotations & stock sync requests...\n`);

  const poll = async () => {
    try {
      await processQueuedQuotations();
      await processStockPullRequests();
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
