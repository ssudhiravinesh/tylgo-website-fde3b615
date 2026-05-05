# GEMINI.md — Tylgo Project Direction

> This file defines the strategic direction, principles, and ground rules for the Tylgo project.
> Every developer, AI agent, or contributor MUST read and follow this before making any changes.

---

## 🏢 Client

**ANUJ Tiles** — a tile manufacturing and distribution brand.

## 🎯 Project Vision

Tylgo is the **operating system for tile businesses**. Phase 1 (internal showroom tool) is **complete**. We are now building Phase 2 — Tally Prime ERP integration to unify ANUJ's inventory, pricing, and sales data between Tylgo and their existing accounting system.

### The Roadmap

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1** | Internal tool — showroom staff manage customers, rooms, tiles, quotations | ✅ Complete |
| **Phase 2** | Tally Prime ERP integration — stock sync, sales voucher push, SKU mapping | 🚧 Active |
| **Phase 3** | Public-facing e-commerce — customers browse and purchase tiles/products online | 🔜 Planned |
| **Phase 4** | Custom Room Visualizer — customers input room dimensions, select tiles, and preview before purchase | 🔜 Planned |
| **Phase 5** | Full order management — shopping cart, payment integration, order tracking, delivery | 🔜 Planned |

---

## 🛡️ Non-Negotiable Principles

### Brand Value
- This is a **corporate-grade product** for a real business. No half-baked UIs, placeholder text, or amateur design.
- Every screen must feel **premium and professional**.
- ANUJ Tiles' reputation is at stake. Every pixel matters.

### Security
- **Row Level Security (RLS)** on every Supabase table. No exceptions.
- Multi-tenant architecture: showrooms are isolated. A user in Showroom A must NEVER see Showroom B's data.
- Auth tokens use `sessionStorage` for tab isolation (already implemented).
- `.env` files and secrets must NEVER be committed (ensure `.gitignore` is enforced).
- Edge Functions handle sensitive operations (PDF generation, email sending, admin user creation, password resets).
- Every new feature that touches data must define its RLS policies in the migration file.

### Code Quality
- TypeScript strict. No `any` unless absolutely unavoidable and documented.
- Components must be focused and reusable. No 1000-line god components.
- Custom hooks for all data logic (already the pattern — `useCustomers`, `useTiles`, `useQuotations`, etc.).
- All Supabase schema changes go through migration files in `supabase/migrations/`.

---

## 🏗️ Architecture Notes

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Library**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS 3 (with custom design tokens)
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Data Fetching**: TanStack React Query
- **Deployment**: Vercel (SPA with client-side routing)
- **PDF Generation**: jsPDF + jspdf-autotable + html2canvas
- **QR Codes**: html5-qrcode + qrcode
- **Charts**: Recharts

### Multi-Tenant Model
```
Brand (e.g., ANUJ Tiles)
  └── Showroom (e.g., "Ahmedabad Main")
        ├── Workers (can create customers, rooms, quotations)
        ├── Admins (can manage tiles, workers, view analytics)
        └── Customers (belong to this showroom)

Super Admin (can see all brands, all showrooms)
```

### Domain Strategy
- **Root domains**: `tylgo.com`, `tylgo.store`, `*.vercel.app`, `localhost`
- **Showroom access**: `{subdomain}.tylgo.store` or `?showroom={subdomain}` in dev
- Landing page shown on root domain; dashboard shown after login on showroom subdomain.

### Tally Prime ERP Integration
ANUJ Tiles runs **TallyPrime on Cloud** for all accounting, inventory, and stock management.

**Architecture:**
```
┌──────────────┐     ┌─────────────────────┐     ┌───────────────┐
│  Tylgo.store  │────→│  Supabase Edge Fn   │────→│  TallyPrime   │
│  (Vercel)     │←────│  (Middleware Layer)  │←────│  (Cloud,      │
│               │     │                     │     │   port 9000)  │
└──────────────┘     └─────────────────────┘     └───────────────┘
                              │
                    ┌─────────┴─────────┐
                    │  Queue + Retry    │
                    │  + Error Logging  │
                    └───────────────────┘
```

**Key Integration Points:**
- **Stock Sync (Tally → Tylgo)**: Scheduled pull of inventory levels via XML API export
- **Sales Voucher Push (Tylgo → Tally)**: Auto-create voucher on order placement via XML API import
- **SKU Mapping**: `tally_stock_mappings` table maps `tile.code` ↔ Tally `STOCKITEMNAME`
- **Protocol**: HTTP POST with XML/JSON payloads to Tally Cloud endpoint
- **Fallback**: Queue failed requests, retry with exponential backoff

---

## 📋 Feature Tracking

All features — existing and new — are tracked in [MASTER_TRACKER.md](./MASTER_TRACKER.md).
**Every new feature, fix, or enhancement must be logged there before it's considered "done".**

---

## 🧠 Working with AI Agents

- Skills files may be included for specific tasks. Follow them precisely.
- Always update `MASTER_TRACKER.md` after completing a feature.
- Never break existing functionality. Run the app locally and verify before committing.
- When adding a migration, use the naming convention: `YYYYMMDDHHMMSS_description.sql`.
- Ask before making architectural decisions. Don't assume.

---

## 📁 Key Directories

| Path | Purpose |
|------|---------|
| `src/pages/` | Top-level page components (routing targets) |
| `src/components/` | Feature-grouped UI components |
| `src/hooks/` | Custom React hooks (data fetching, auth, mutations) |
| `src/types/` | Centralized TypeScript type definitions (domain entities) |
| `src/utils/` | Pure utility functions (calculations, conversions) |
| `src/utils/calculations/` | Business logic calculators (tile requirements, quotation math) |
| `src/utils/queries/` | Shared Supabase SELECT field constants |
| `src/contexts/` | React context providers |
| `src/integrations/supabase/` | Supabase client and generated types |
| `supabase/migrations/` | Database schema migrations (65 files and counting) |
| `supabase/functions/` | Supabase Edge Functions |
| `public/` | Static assets (logo, robots.txt) |
