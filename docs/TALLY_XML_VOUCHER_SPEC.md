# TallyPrime XML Import — Sales Voucher Spec

> **Status:** CONFIRMED WORKING — 2026-05-16, Voucher ID 17 (BHARGAVA ₹46,754)
> **Source:** Reverse-engineered from `tally-export-sales.xml` (actual TallyPrime export)
> **Relay version:** TALLY-RELAY-JT
> **Tally version:** TallyPrime (Cloud, port 9000)

---

## The Rule That Ended All Debugging

**Use Tally's own export XML as the import template. Never guess.**

The `--export-voucher` CLI command (or Ctrl+E → XML in TallyPrime) produces the exact format
Tally accepts on import. If you break this integration again, export a working voucher and diff it.

---

## Item Invoice Mode (with inventory items)

### Full Confirmed Working XML

```xml
<ENVELOPE>
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
            <DATE>YYYYMMDD</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
            <VCHENTRYMODE>Item Invoice</VCHENTRYMODE>
            <ISINVOICE>Yes</ISINVOICE>
            <VOUCHERNUMBER>...</VOUCHERNUMBER>
            <NARRATION>...</NARRATION>
            <PARTYLEDGERNAME>CUSTOMER</PARTYLEDGERNAME>

            <!-- ① INVENTORY ENTRIES — come BEFORE the party ledger entry -->
            <ALLINVENTORYENTRIES.LIST>
              <STOCKITEMNAME>ITEM NAME</STOCKITEMNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <ISLASTDEEMEDPOSITIVE>No</ISLASTDEEMEDPOSITIVE>
              <ISAUTONEGATE>No</ISAUTONEGATE>
              <ISCUSTOMSCLEARANCE>No</ISCUSTOMSCLEARANCE>
              <ISTRACKCOMPONENT>No</ISTRACKCOMPONENT>
              <ISTRACKPRODUCTION>No</ISTRACKPRODUCTION>
              <ISPRIMARYITEM>No</ISPRIMARYITEM>
              <ISSCRAP>No</ISSCRAP>
              <RATE>1000.00/BOX</RATE>
              <AMOUNT>1000.00</AMOUNT>        ← POSITIVE
              <ACTUALQTY> 1.00 BOX</ACTUALQTY>
              <BILLEDQTY> 1.00 BOX</BILLEDQTY>
              <ACCOUNTINGALLOCATIONS.LIST>
                <LEDGERNAME>Sales Account</LEDGERNAME>
                <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                <ISPARTYLEDGER>No</ISPARTYLEDGER>
                <ISLASTDEEMEDPOSITIVE>No</ISLASTDEEMEDPOSITIVE>
                <AMOUNT>1000.00</AMOUNT>      ← POSITIVE
              </ACCOUNTINGALLOCATIONS.LIST>
            </ALLINVENTORYENTRIES.LIST>
            <!-- ... repeat for each item ... -->

            <!-- ② PARTY LEDGER — comes AFTER all inventory entries -->
            <!-- NO separate Sales Account entry here -->
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>CUSTOMER</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <ISLASTDEEMEDPOSITIVE>Yes</ISLASTDEEMEDPOSITIVE>
              <AMOUNT>-1000.00</AMOUNT>       ← NEGATIVE
            </LEDGERENTRIES.LIST>

          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>
```

### Sign Convention Table

| Entry | Tag | `ISDEEMEDPOSITIVE` | `ISLASTDEEMEDPOSITIVE` | `AMOUNT` |
|---|---|---|---|---|
| Stock item | `ALLINVENTORYENTRIES.LIST` | `No` | `No` | **+item (POSITIVE)** |
| Sales allocation | `ACCOUNTINGALLOCATIONS.LIST` | `No` | `No` | **+item (POSITIVE)** |
| Party (customer) | `LEDGERENTRIES.LIST` | `Yes` | `Yes` | **-total (NEGATIVE)** |

### Critical Rules

1. **`LEDGERENTRIES.LIST`** — NOT `ALLLEDGERENTRIES.LIST`
2. **Inventory BEFORE ledger** — `ALLINVENTORYENTRIES` must come before `LEDGERENTRIES`
3. **No separate Sales Account** — credit is captured via `ACCOUNTINGALLOCATIONS` inside each inventory entry
4. **`OBJVIEW`, `PERSISTEDVIEW`, `VCHENTRYMODE`** — all three required for Item Invoice mode
5. **Amounts: inventory=POSITIVE, party=NEGATIVE** — this is Tally's own convention from its exports

---

## Accounting-Only Mode (no inventory items)

Used when a quotation has no mapped stock items.

```xml
<VOUCHER VCHTYPE="Sales" ACTION="Create">
  ...
  <LEDGERENTRIES.LIST>
    <LEDGERNAME>CUSTOMER</LEDGERNAME>
    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
    <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
    <ISLASTDEEMEDPOSITIVE>Yes</ISLASTDEEMEDPOSITIVE>
    <AMOUNT>1000.00</AMOUNT>    ← POSITIVE
  </LEDGERENTRIES.LIST>
  <LEDGERENTRIES.LIST>
    <LEDGERNAME>Sales Account</LEDGERNAME>
    <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
    <ISPARTYLEDGER>No</ISPARTYLEDGER>
    <ISLASTDEEMEDPOSITIVE>No</ISLASTDEEMEDPOSITIVE>
    <AMOUNT>-1000.00</AMOUNT>   ← NEGATIVE
  </LEDGERENTRIES.LIST>
</VOUCHER>
```

> Note: Sign convention is **inverted** compared to inventory mode. This is Tally's own asymmetry.
> Party = POSITIVE, Sales = NEGATIVE in accounting-only mode.

---

## Error Diagnosis

| Tally Error | Root Cause |
|---|---|
| `Dr: empty, Cr: 46754` | Using `ALLLEDGERENTRIES.LIST` instead of `LEDGERENTRIES.LIST`, or wrong AMOUNT signs |
| `Dr: 46754, Cr: empty` | Inventory amounts are negative (double-negative with ISDEEMEDPOSITIVE=No drops them) |
| Voucher accepted but stock not reduced | `ALLINVENTORYENTRIES` is empty or `STOCKITEMNAME` doesn't match Tally exactly |
| Customer ledger not found | Run `ensureCustomerLedger()` first — creates ledger under Sundry Debtors if missing |

---

## Implementation

- **File:** `TALLY-RELAY-JT/index.js`
- **Function:** `buildSalesVoucherXml()`
- **Reference export:** `tally-export-sales.xml` (committed to repo — the ground truth)
- **Discount handling:** Applied proportionally across items; last item absorbs rounding
- **Party ledger creation:** `ensureCustomerLedger()` runs before each voucher push
- **Sales ledger name:** `.env` → `SALES_LEDGER_NAME` (default: `Sales Account`, case-sensitive)
