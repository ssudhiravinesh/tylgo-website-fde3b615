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
          <AMOUNT>${-Math.abs(item.amount)}</AMOUNT>
          <ACTUALQTY>${item.quantity}${item.unit ? ` ${item.unit}` : ''}</ACTUALQTY>
          <BILLEDQTY>${item.quantity}${item.unit ? ` ${item.unit}` : ''}</BILLEDQTY>
          <ACCOUNTINGALLOCATIONS.LIST>
            <LEDGERNAME>${salesName}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>${-Math.abs(item.amount)}</AMOUNT>
          </ACCOUNTINGALLOCATIONS.LIST>
        </ALLINVENTORYENTRIES.LIST>`).join('');
  }

  // Build the voucher XML
  // Note: If items are present, we use ALLINVENTORYENTRIES for stock tracking.
  // If no items, we use simple ALLLEDGERENTRIES (accounting-only mode).
  const hasInventory = voucher.items && voucher.items.length > 0;

  let ledgerEntries: string;
  if (hasInventory) {
    // With inventory: party debit + sales credit handled via inventory allocations
    ledgerEntries = `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${partyName}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>${Math.abs(voucher.totalAmount)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`;
  } else {
    // Without inventory: simple double-entry
    ledgerEntries = `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${partyName}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>${Math.abs(voucher.totalAmount)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${salesName}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${-Math.abs(voucher.totalAmount)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`;
  }

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
