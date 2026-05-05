# Tally Relay Service

Bridges Tylgo (Supabase) → TallyPrime (via VCC tunnel on localhost:9000).

## Setup (one-time, on the showroom Windows PC)

### Prerequisites
- ✅ Windows PC with VCC Client installed and connected (green status)
- ✅ Node.js 18+ installed ([download](https://nodejs.org/))
- ✅ TallyPrime accessible at `localhost:9000`

### Steps

1. **Copy this folder** to the showroom PC (e.g., `C:\Tylgo\tally-relay\`)

2. **Install dependencies:**
   ```
   cd C:\Tylgo\tally-relay
   npm install
   ```

3. **Configure environment:**
   ```
   copy .env.example .env
   notepad .env
   ```
   Fill in:
   - `SUPABASE_SERVICE_KEY` — get from Supabase Dashboard → Settings → API → Service Role Key
   - `SALES_LEDGER_NAME` — the exact name of the Sales Account in Tally (default: "Sales Account")

4. **Start the relay:**
   ```
   npm start
   ```
   You should see:
   ```
   ╔══════════════════════════════════════════════╗
   ║       Tylgo → Tally Relay Service v1.0      ║
   ╚══════════════════════════════════════════════╝
     Tally endpoint: http://localhost:9000
     Poll interval:  5s
     ✅ Tally is reachable and responding
   ```

## How it works

1. Showroom worker clicks **"Send to Billing"** on a quotation in Tylgo
2. Quotation gets `tally_sync_status = 'queued'` in Supabase
3. This relay script polls Supabase every 5 seconds
4. When it finds a queued quotation:
   - Auto-creates the customer as a ledger in Tally (under Sundry Debtors) if not exists
   - Builds a Sales Voucher XML
   - POSTs to `localhost:9000` (VCC tunnel → Tally)
5. Updates the quotation status in Supabase:
   - `synced` ✅ on success (with voucher number)
   - `failed` ❌ on error (with error message for retry)

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Tally is not reachable" | Check VCC Client shows green status. Restart VCC if needed. |
| "Connection error: ECONNREFUSED" | Tally isn't running or VCC tunnel is down |
| "Could not create customer ledger" | Check the company is open in TallyPrime |
| Voucher created but not in Sales Register | Date might be outside the company's Financial Year |

## Running as a Windows Service

For production, run this as a Windows service so it auto-starts on boot:

```
npm install -g node-windows
```

Then create a service wrapper (future task).
