# TallyPrime XML Import — Sales Voucher with Inventory

> **Status:** Confirmed working as of 2026-05-16  
> **Relay version:** `TALLY-RELAY-JT v2.1`  
> **Tally version:** TallyPrime (Cloud, port 9000)

---

## The Core Rule (Do Not Change This)

TallyPrime XML import uses **mixed sign convention** for inventory vouchers:

| Entry | Amount sign | Why |
|---|---|---|
| Party (customer debit) | **NEGATIVE** (`-46754`) | Tally reads a negative ISDEEMEDPOSITIVE=Yes as a Debit |
| Inventory items | **POSITIVE** (`+4768`) | `ISDEEMEDPOSITIVE=No` already signals outgoing/credit — don't double-negate |
| ACCOUNTINGALLOCATIONS | **POSITIVE** (`+4768`) | Same rule — ISDEEMEDPOSITIVE=No handles the sign |

> ⚠️ **The trap:** If you make inventory amounts negative AND set `ISDEEMEDPOSITIVE=No`, Tally double-negates them and either drops the credit or reads it as a debit. You will see `Dr: 46754 Cr: (empty)` in the error.

This is the rule that took the most iterations to nail down because Tally's documentation doesn't explain the interaction between ISDEEMEDPOSITIVE and the AMOUNT sign for ALLINVENTORYENTRIES.

---

## Voucher Structure

### Full XML Template

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
          <VOUCHER VCHTYPE="Sales" ACTION="Create">
            <DATE>YYYYMMDD</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <ISINVOICE>Yes</ISINVOICE>
            <VOUCHERNUMBER>...</VOUCHERNUMBER>
            <NARRATION>...</NARRATION>
            <PARTYLEDGERNAME>CUSTOMER NAME</PARTYLEDGERNAME>

            <!-- ① PARTY DEBIT (Dr) -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>CUSTOMER NAME</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <AMOUNT>-1000.00</AMOUNT>   ← NEGATIVE (party debit)
            </ALLLEDGERENTRIES.LIST>

            <!-- ② INVENTORY CREDIT (Cr) — one block per stock item -->
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
              <AMOUNT>1000.00</AMOUNT>   ← POSITIVE (ISDEEMEDPOSITIVE=No handles credit direction)
              <ACTUALQTY> 1.00 BOX</ACTUALQTY>
              <BILLEDQTY> 1.00 BOX</BILLEDQTY>

              <!-- ③ SALES LEDGER ALLOCATION (sub-allocation, not an extra credit) -->
              <ACCOUNTINGALLOCATIONS.LIST>
                <LEDGERNAME>Sales Account</LEDGERNAME>
                <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                <ISPARTYLEDGER>No</ISPARTYLEDGER>
                <AMOUNT>1000.00</AMOUNT>   ← POSITIVE (same rule)
              </ACCOUNTINGALLOCATIONS.LIST>
            </ALLINVENTORYENTRIES.LIST>

          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>
```

---

## Ledger Entry Reference

| Entry | Tag | `ISDEEMEDPOSITIVE` | `AMOUNT` | Tally Effect |
|---|---|---|---|---|
| Party (customer) | `ALLLEDGERENTRIES.LIST` | `Yes` | **-total (NEGATIVE)** | Debit (Dr) |
| Stock item | `ALLINVENTORYENTRIES.LIST` | `No` | **+amount (POSITIVE)** | Credit (Cr) — ISDEEMEDPOSITIVE=No handles sign |
| Sales ledger | `ACCOUNTINGALLOCATIONS.LIST` | `No` | **+amount (POSITIVE)** | Sub-allocation of the inventory credit |

**Key insight:** `ACCOUNTINGALLOCATIONS.LIST` does **not** add a second credit. It only specifies which ledger the inventory credit flows into. Tally counts it as part of the same `ALLINVENTORYENTRIES.LIST` credit.

**The double-negative trap:** Setting `ISDEEMEDPOSITIVE=No` AND `AMOUNT=-1000` causes Tally to cancel the signs and either drop the entry or read it as a debit. Result: `Dr: 46754 Cr: (empty)`.

---

## What NOT To Do

### ❌ Wrong tag name for party ledger
```xml
<LEDGERENTRIES.LIST>   ← Tally silently ignores this in inventory vouchers
  <LEDGERNAME>CUSTOMER</LEDGERNAME>
  ...
</LEDGERENTRIES.LIST>
```
**Use `ALLLEDGERENTRIES.LIST` instead.**

### ❌ Positive amounts
```xml
<AMOUNT>1000.00</AMOUNT>   ← Tally reads this as zero on the Debit side
```
**All amounts must be negative.**

### ❌ Duplicate Sales Account top-level ledger
```xml
<!-- This doubles the credit from 1000 to 2000 -->
<ALLLEDGERENTRIES.LIST>
  <LEDGERNAME>Sales Account</LEDGERNAME>
  ...
  <AMOUNT>1000.00</AMOUNT>
</ALLLEDGERENTRIES.LIST>
<ALLINVENTORYENTRIES.LIST>
  ...
  <ACCOUNTINGALLOCATIONS.LIST>
    <LEDGERNAME>Sales Account</LEDGERNAME>  ← already credits here
    ...
  </ACCOUNTINGALLOCATIONS.LIST>
</ALLINVENTORYENTRIES.LIST>
```
**Do not add a top-level `ALLLEDGERENTRIES.LIST` for the sales ledger when inventory is present.**

### ❌ `OBJVIEW`, `PERSISTEDVIEW`, `VCHENTRYMODE` tags on import
```xml
<VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">
  <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
  <VCHENTRYMODE>Item Invoice</VCHENTRYMODE>
```
These tags appear in Tally's **export** XML but cause strict parsing issues on **import**. Omit them entirely.

---

## Accounting-Only Voucher (No Inventory)

When a quotation has no mapped stock items, a simpler structure is used:

```xml
<VOUCHER VCHTYPE="Sales" ACTION="Create">
  ...
  <PARTYLEDGERNAME>CUSTOMER</PARTYLEDGERNAME>
  <ALLLEDGERENTRIES.LIST>
    <LEDGERNAME>CUSTOMER</LEDGERNAME>
    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
    <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
    <AMOUNT>-1000.00</AMOUNT>   ← NEGATIVE
  </ALLLEDGERENTRIES.LIST>
  <ALLLEDGERENTRIES.LIST>
    <LEDGERNAME>Sales Account</LEDGERNAME>
    <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
    <AMOUNT>1000.00</AMOUNT>   ← POSITIVE (credit in accounting-only mode)
  </ALLLEDGERENTRIES.LIST>
</VOUCHER>
```

> Note: In accounting-only mode, the Sales Account amount is **positive**. This is the one case where amounts differ from the inventory mode. This asymmetry is a Tally quirk, not a mistake.

---

## Error Diagnosis Guide

| Tally Error | What It Means | Fix |
|---|---|---|
| `Dr: (empty) Cr: 46754` | Party debit not registered | Wrong tag (`LEDGERENTRIES.LIST` instead of `ALLLEDGERENTRIES.LIST`), or positive amount on party entry |
| `Dr: 46754 Cr: (empty)` | Inventory credits not registered | Inventory AMOUNT is negative + ISDEEMEDPOSITIVE=No → double negative → Tally drops it. **Make inventory AMOUNT positive.** |
| `Dr: (empty) Cr: 2×amount` | Credits doubled | Duplicate top-level `ALLLEDGERENTRIES.LIST` for Sales Account (already covered by ACCOUNTINGALLOCATIONS) |
| Voucher imported but no line items | `ACCOUNTINGALLOCATIONS.LIST` missing inside `ALLINVENTORYENTRIES.LIST` | Add the sub-allocation block |

---

## Relay Implementation Notes

- **File:** `TALLY-RELAY-JT/index.js`
- **Function:** `buildSalesVoucherXml(quotation, mappedItems, ...)`
- **Discount handling:** Discount is applied proportionally across items. Last item absorbs the rounding remainder so `sum(item amounts) === partyTotal` exactly.
- **Party ledger auto-creation:** `ensureCustomerLedger()` checks `ALLLEDGERENTRIES` in Tally before each voucher and creates the ledger under "Sundry Debtors" if missing.
- **Sales ledger name:** Configurable via `.env` → `SALES_LEDGER_NAME` (default: `Sales Account`). Must match the ledger name in Tally exactly (case-sensitive).
