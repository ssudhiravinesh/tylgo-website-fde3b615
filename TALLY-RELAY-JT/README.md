# TALLY-RELAY-JT — Tylgo → TallyPrime Relay v2.1

Runs on the **showroom Windows PC** where VCC Client creates the `localhost:9000` tunnel to TallyPrime Cloud.

## What it does

1. Polls Supabase every 5s for quotations with `tally_sync_status = 'queued'`
2. Auto-creates customer ledger in Tally if it doesn't exist
3. Fetches quotation line items and maps them to Tally stock items via `tally_stock_mappings`
4. Builds XML with both **ledger entries** (accounting) and **inventory entries** (stock movement)
5. POSTs to TallyPrime via VCC tunnel
6. Updates sync status in Supabase + logs to `tally_sync_log`

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
copy .env.example .env
# Edit .env with your Supabase service key

# 3. Run
dotenv -e .env -- npm start
# OR if dotenv is not installed globally:
# npx dotenv -e .env -- npm start
```

## Requirements

- Node.js 18+
- VCC Client connected (green status)
- `dotenv-cli` for loading env vars: `npm install -g dotenv-cli`

## Stock Mappings

For tiles to show as inventory items in Tally (and reduce stock), they must be mapped in the `tally_stock_mappings` Supabase table:

| tile_id (UUID) | tally_stock_item_name |
|---|---|
| `2b2d45a4-...` | `JF 1200X600 PGVT 24002 PRE 2T` |

Unmapped tiles still count toward the total amount — they just don't appear as named stock items in the Tally voucher.
