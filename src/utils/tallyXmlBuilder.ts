/**
 * Tally XML Builder — generates TallyPrime-compatible XML for API operations.
 * 
 * Confirmed working format (tested 2026-05-05 against TallyPrime 2.1.0):
 * - Import uses: <TALLYREQUEST>Import Data</TALLYREQUEST> (with space)
 * - Body uses: <IMPORTDATA><REQUESTDESC><REPORTNAME>...</REPORTNAME></REQUESTDESC><REQUESTDATA>...</REQUESTDATA></IMPORTDATA>
 * - Export uses: <TALLYREQUEST>EXPORT</TALLYREQUEST> with <VERSION>1</VERSION>, <TYPE>COLLECTION</TYPE>
 * 
 * Key rules:
 * - Debit amounts = positive, Credit amounts = negative
 * - Party (customer/debtor) = positive (debit)
 * - Sales Account = negative (credit)
 * - Debits and credits MUST sum to 0
 * - Date format: YYYYMMDD
 * - LEDGERNAME must exactly match existing Tally ledger names (case-sensitive)
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TallySalesVoucherItem {
  stockItemName: string;       // Must match Tally STOCKITEMNAME exactly
  quantity: number;            // Number of units (boxes)
  rate: number;                // Price per unit
  amount: number;              // Total (negative for credit)
  unit?: string;               // Unit of measure (e.g., "Box", "Nos")
}

export interface TallySalesVoucher {
  date: Date;
  voucherNumber?: string;      // Optional — Tally auto-numbers if omitted
  partyLedgerName: string;     // Customer name (must exist as ledger in Tally)
  salesLedgerName: string;     // Sales account ledger name
  narration?: string;          // Description/notes
  totalAmount: number;         // Grand total
  items?: TallySalesVoucherItem[];  // Optional inventory items
}

export interface TallyLedger {
  name: string;
  parentGroup: string;         // e.g., "Sundry Debtors", "Sales Accounts"
  openingBalance?: number;
}

export interface TallyExportRequest {
  type: 'COLLECTION' | 'Data';
  id: string;                  // Report/collection name
  fromDate?: Date;
  toDate?: Date;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Formats a Date to Tally's YYYYMMDD format */
const formatTallyDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

/** Escapes XML special characters */
const escapeXml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

// ── Builders ───────────────────────────────────────────────────────────────────

/**
 * Build XML to create a Sales Voucher (invoice) in Tally.
 * This is the core integration point — converts a Tylgo quotation into a Tally Sales entry.
 */
export const buildSalesVoucherXml = (voucher: TallySalesVoucher): string => {
  const dateStr = formatTallyDate(voucher.date);
  const narration = voucher.narration ? escapeXml(voucher.narration) : '';
  const partyName = escapeXml(voucher.partyLedgerName);
  const salesName = escapeXml(voucher.salesLedgerName);

  // Build inventory entries if items are provided
  let inventoryEntries = '';
  if (voucher.items && voucher.items.length > 0) {
    inventoryEntries = voucher.items.map(item => `
        <ALLINVENTORYENTRIES.LIST>
          <STOCKITEMNAME>${escapeXml(item.stockItemName)}</STOCKITEMNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <RATE>${item.rate}${item.unit ? `/${item.unit}` : ''}</RATE>
          <AMOUNT>-${Math.abs(item.amount)}</AMOUNT>
          <ACTUALQTY>${item.quantity}${item.unit ? ` ${item.unit}` : ''}</ACTUALQTY>
          <BILLEDQTY>${item.quantity}${item.unit ? ` ${item.unit}` : ''}</BILLEDQTY>
          <ACCOUNTINGALLOCATIONS.LIST>
            <LEDGERNAME>${salesName}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>-${Math.abs(item.amount)}</AMOUNT>
          </ACCOUNTINGALLOCATIONS.LIST>
        </ALLINVENTORYENTRIES.LIST>`).join('');
  }

  // Build the voucher XML
  // TallyPrime Sales vouchers require ALL amounts as NEGATIVE.
  // ISDEEMEDPOSITIVE=Yes + negative amount = Debit entry
  // ISDEEMEDPOSITIVE=No  + negative amount = Credit entry
  const hasInventory = voucher.items && voucher.items.length > 0;

  // Ledger entries: Party debit + Sales credit (ALWAYS present, ALWAYS balance)
  let ledgerEntries: string = `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${partyName}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-${Math.abs(voucher.totalAmount)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${salesName}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>-${Math.abs(voucher.totalAmount)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`;

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
            <ISINVOICE>Yes</ISINVOICE>${voucher.voucherNumber ? `
            <VOUCHERNUMBER>${escapeXml(voucher.voucherNumber)}</VOUCHERNUMBER>` : ''}
            <NARRATION>${narration}</NARRATION>
            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>${ledgerEntries}${inventoryEntries}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
};

/**
 * Build XML to create a Ledger master (customer party, sales account, etc.)
 */
export const buildCreateLedgerXml = (ledger: TallyLedger): string => {
  const name = escapeXml(ledger.name);
  const parent = escapeXml(ledger.parentGroup);

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
          <LEDGER NAME="${name}" Action="Create">
            <NAME>${name}</NAME>
            <PARENT>${parent}</PARENT>
            <OPENINGBALANCE>${ledger.openingBalance || 0}</OPENINGBALANCE>
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
};

/**
 * Build XML to export/query data from Tally (stock items, ledgers, etc.)
 */
export const buildExportXml = (request: TallyExportRequest): string => {
  let staticVars = `
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>`;
  
  if (request.fromDate) {
    staticVars += `
        <SVFROMDATE>${formatTallyDate(request.fromDate)}</SVFROMDATE>`;
  }
  if (request.toDate) {
    staticVars += `
        <SVTODATE>${formatTallyDate(request.toDate)}</SVTODATE>`;
  }

  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>${request.type}</TYPE>
    <ID>${escapeXml(request.id)}</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>${staticVars}
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;
};

// ── Response Parsers ───────────────────────────────────────────────────────────

export interface TallyImportResponse {
  success: boolean;
  created: number;
  altered: number;
  deleted: number;
  errors: number;
  lastVoucherId: number;
  raw: string;
}

/**
 * Parse Tally's import response XML to determine success/failure.
 * Response format: <RESPONSE><CREATED>1</CREATED><ERRORS>0</ERRORS>...</RESPONSE>
 */
export const parseTallyImportResponse = (xml: string): TallyImportResponse => {
  const getTagValue = (tag: string): string => {
    const match = xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
    return match ? match[1] : '0';
  };

  const created = parseInt(getTagValue('CREATED'), 10);
  const altered = parseInt(getTagValue('ALTERED'), 10);
  const errors = parseInt(getTagValue('ERRORS'), 10);
  const lastVoucherId = parseInt(getTagValue('LASTVCHID'), 10);

  return {
    success: errors === 0 && (created > 0 || altered > 0),
    created,
    altered,
    deleted: parseInt(getTagValue('DELETED'), 10),
    errors,
    lastVoucherId,
    raw: xml,
  };
};

/**
 * Extract stock item names from Tally's collection export response.
 */
export const parseStockItemsResponse = (xml: string): string[] => {
  const matches = xml.match(/STOCKITEM NAME="([^"]+)"/g);
  if (!matches) return [];
  return matches.map(m => m.replace('STOCKITEM NAME="', '').replace('"', ''));
};

/**
 * Extract ledger names from Tally's collection export response.
 */
export const parseLedgerNamesResponse = (xml: string): string[] => {
  const matches = xml.match(/LEDGER NAME="([^"]+)"/g);
  if (!matches) return [];
  return matches.map(m => m.replace('LEDGER NAME="', '').replace('"', ''));
};

// ── Stock Balance Query & Parser ───────────────────────────────────────────────

export interface TallyStockBalance {
  stockItemName: string;
  closingBalance: number;
}

/**
 * Build XML to export stock item names with their closing balances from Tally.
 * Uses TDL COLLECTION to fetch NAME and CLOSINGBALANCE for all stock items.
 * 
 * The relay sends this XML to Tally (POST localhost:9000), parses the response,
 * then batch-updates tiles.stock_quantity in Supabase via tally_stock_mappings.
 */
export const buildStockBalanceExportXml = (): string => {
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
};

/**
 * Parse Tally's stock balance export response.
 * 
 * Expected response format:
 * ```xml
 * <COLLECTION>
 *   <STOCKITEM NAME="JF 1200X600 PGVT 24001 PRE 2T">
 *     <NAME>JF 1200X600 PGVT 24001 PRE 2T</NAME>
 *     <CLOSINGBALANCE>150.00</CLOSINGBALANCE>
 *   </STOCKITEM>
 *   ...
 * </COLLECTION>
 * ```
 * 
 * Returns an array of { stockItemName, closingBalance } objects.
 * Items with no closing balance or unparseable values default to 0.
 */
export const parseStockBalanceResponse = (xml: string): TallyStockBalance[] => {
  const results: TallyStockBalance[] = [];

  // Match each STOCKITEM block
  const stockItemRegex = /<STOCKITEM[^>]*NAME="([^"]*)"[^>]*>([\s\S]*?)<\/STOCKITEM>/gi;
  let match: RegExpExecArray | null;

  while ((match = stockItemRegex.exec(xml)) !== null) {
    const name = match[1];
    const block = match[2];

    // Extract CLOSINGBALANCE value from within this block
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
};

