# MASTER_TRACKER.md — Tylgo Feature & Status Registry

> **Last Updated**: 2026-05-05
> **Rule**: Every new feature, fix, or enhancement must be logged here with its status before it's considered "done."

---

## 📊 Project Overview

| Metric | Value |
|--------|-------|
| **Project** | Tylgo — Tile Business Operating System |
| **Client** | ANUJ Tiles |
| **Current Phase** | Phase 2 — Tally Prime ERP Integration (Active) |
| **Tech Stack** | React 18 / TypeScript / Vite / Supabase / Tailwind / shadcn/ui |
| **Deployment** | Vercel (SPA) |
| **Database** | Supabase PostgreSQL (66 migrations) |
| **Domains** | tylgo.com, tylgo.store, {showroom}.tylgo.store |

---

## ✅ Phase 1 — Internal Tool (COMPLETE)

### Authentication & Authorization
| Feature | Status | Notes |
|---------|--------|-------|
| Email/password authentication (Supabase Auth) | ✅ Done | |
| Role-based access control (super_admin, admin, worker) | ✅ Done | 3 roles with different sidebar views |
| Profile auto-creation on signup (DB trigger) | ✅ Done | `handle_new_user()` trigger on `auth.users` |
| Session management with tab isolation | ✅ Done | Uses `sessionStorage`, not `localStorage` |
| Tenant verification gatekeeper | ✅ Done | Verifies user belongs to the showroom's subdomain |
| Logout with confirmation dialog | ✅ Done | |
| Sign-up form with showroom assignment | ✅ Done | |

### Multi-Tenant Architecture
| Feature | Status | Notes |
|---------|--------|-------|
| Brand → Showroom → User hierarchy | ✅ Done | |
| Subdomain-based showroom routing | ✅ Done | `{subdomain}.tylgo.store` |
| Query-param fallback for dev | ✅ Done | `?showroom={subdomain}` on localhost/vercel |
| Landing page with "Find My Showroom" flow | ✅ Done | Brand → Showroom dropdown → redirect |
| RLS policies per showroom | ✅ Done | Data isolation between showrooms |
| Brand-level tile/product sharing | ✅ Done | Tiles and products belong to a brand, shared across its showrooms |

### Customer Management
| Feature | Status | Notes |
|---------|--------|-------|
| Customer CRUD (create, read, update, delete) | ✅ Done | |
| Customer list with search | ✅ Done | Search by name, mobile, reference |
| Customer form with validation | ✅ Done | |
| Mobile number search | ✅ Done | |
| Reference name search | ✅ Done | |
| Direct customer search | ✅ Done | |
| Customer details view | ✅ Done | |
| `attended_by` worker tracking | ✅ Done | |
| `last_interaction_at` timestamp | ✅ Done | |
| Customer analytics (admin) | ✅ Done | Charts and stats |
| Indian states and cities data | ✅ Done | Utility file for address forms |

### Tile Catalog & Management
| Feature | Status | Notes |
|---------|--------|-------|
| Tile CRUD (admin) | ✅ Done | Code, name, dimensions, pricing |
| Tile catalog browsing (worker) | ✅ Done | Grid view with tile cards |
| Tile search & filter | ✅ Done | |
| Tile details dialog | ✅ Done | |
| Tile details page (dedicated route) | ✅ Done | `/tiles/:tileId` |
| Tile image upload (Supabase Storage) | ✅ Done | |
| Bulk price update | ✅ Done | Update prices across multiple tiles |
| Category-based bulk price update | ✅ Done | |
| Tile assignment dialog | ✅ Done | |
| Download catalogue as PDF | ✅ Done | |
| QR code support for tiles | ✅ Done | |
| Floor tile preview visualization | ✅ Done | Visual preview of tile in a room |
| Brand-level tile management | ✅ Done | Tiles belong to brand, not showroom |

### Room Management
| Feature | Status | Notes |
|---------|--------|-------|
| Room CRUD per customer | ✅ Done | |
| Room form with dimensions (length, breadth, unit) | ✅ Done | |
| Wall dimensions (height, length) | ✅ Done | |
| Surface type support (floor/wall) | ✅ Done | |
| Unit conversions (mm, inches, feet, metres) | ✅ Done | |
| Custom feet-inch input component | ✅ Done | `feet-inch-input.tsx`, `feet-inches-input.tsx` |
| Customer room management page | ✅ Done | |

### Staircase Management
| Feature | Status | Notes |
|---------|--------|-------|
| Staircase CRUD per customer | ✅ Done | |
| Step and riser tile selection | ✅ Done | |
| Staircase dimensions (step length/width, riser height/width) | ✅ Done | |
| Area-based and count-based tile calculation | ✅ Done | Falls back to aspect-ratio logic if no dimensions |
| Staircase tile requirement calculations | ✅ Done | |

### Tile Selection & Calculation Engine
| Feature | Status | Notes |
|---------|--------|-------|
| Floor tile selection per room | ✅ Done | |
| Wall tile selection with multi-layer support | ✅ Done | Divide wall into layers, assign different tiles |
| Wastage percentage calculation (0–15%) | ✅ Done | |
| Tiles needed / boxes needed / cost calculation | ✅ Done | `tileCalculations.ts` — 620 lines |
| Proportional pricing per room | ✅ Done | |
| Unit conversion engine | ✅ Done | `unitConversions.ts` |

### Quotation System
| Feature | Status | Notes |
|---------|--------|-------|
| Quotation creation from room selections | ✅ Done | |
| Quotation list with filters (date range, status, search) | ✅ Done | |
| Quotation details view | ✅ Done | Comprehensive breakdown |
| Quotation editing | ✅ Done | Full edit page |
| Quotation deletion with confirmation | ✅ Done | |
| Quotation status management (draft, sent, etc.) | ✅ Done | |
| Discount calculation (percentage-based) | ✅ Done | |
| Quotation action buttons | ✅ Done | |
| Quotation items section | ✅ Done | |

### PDF Generation
| Feature | Status | Notes |
|---------|--------|-------|
| Unified PDF generation | ✅ Done | `useUnifiedPDFGeneration.tsx` — 33K, largest hook |
| Quotation PDF export | ✅ Done | |
| Tile catalogue PDF download | ✅ Done | |
| Edge Function for PDF generation | ✅ Done | `generate-quotation-pdf`, `generate-tiles-pdf` |

### Email System
| Feature | Status | Notes |
|---------|--------|-------|
| Email dialog for quotations | ✅ Done | |
| Email sending hook | ✅ Done | |
| Edge Function for email delivery | ✅ Done | `send-quotation-email` |

### QR Code System
| Feature | Status | Notes |
|---------|--------|-------|
| QR code scanning (camera-based) | ✅ Done | `html5-qrcode` integration |
| Context-aware QR scanner | ✅ Done | Different behavior based on context |
| Camera controls and error handling | ✅ Done | |
| QR scanning context provider | ✅ Done | Global QR state management |

### Product Catalog
| Feature | Status | Notes |
|---------|--------|-------|
| Product CRUD (non-tile products) | ✅ Done | Separate from tiles |
| Product card display | ✅ Done | |
| Product catalog browsing | ✅ Done | |
| Product selection dialog | ✅ Done | |
| Product image upload | ✅ Done | Dedicated `product-images` bucket |
| Product QR code support | ✅ Done | |
| Customer product tracking | ✅ Done | |
| Room-product selections | ✅ Done | |
| Brand-level product management | ✅ Done | |

### Admin Panel
| Feature | Status | Notes |
|---------|--------|-------|
| Admin dashboard with stats | ✅ Done | |
| Worker management (CRUD) | ✅ Done | Add, view, edit workers |
| Worker stats display | ✅ Done | |
| Worker quotation tracking | ✅ Done | |
| Edge Function: admin-create-worker | ✅ Done | Secure worker creation |
| Edge Function: admin-reset-password | ✅ Done | |
| References view | ✅ Done | |

### Super Admin Panel
| Feature | Status | Notes |
|---------|--------|-------|
| Super Admin dashboard | ✅ Done | Cross-brand analytics |
| Brand & showroom card management | ✅ Done | |
| Catalogue stats card | ✅ Done | |
| Analytics charts | ✅ Done | Recharts-based |
| Hierarchy wrapper for data drilling | ✅ Done | Brand → Showroom → Data |
| Super Admin statistics hook | ✅ Done | `useSuperAdminStats.ts` — 15K |

### Excel Export
| Feature | Status | Notes |
|---------|--------|-------|
| Excel export for data | ✅ Done | `xlsx` library integration |
| Custom export hook | ✅ Done | `useExcelExport.tsx` |

### UI/UX
| Feature | Status | Notes |
|---------|--------|-------|
| 54 shadcn/ui components | ✅ Done | Full component library |
| GridLoader (custom loading animation) | ✅ Done | |
| Success animation component | ✅ Done | |
| Responsive sidebar with collapse | ✅ Done | |
| Mobile-responsive design | ✅ Done | `use-mobile.tsx` hook |
| Toast notifications (Sonner) | ✅ Done | |
| Notification context provider | ✅ Done | |
| Sound effects hook | ✅ Done | `useSound.ts` |
| Date range picker | ✅ Done | |
| Manrope font integration | ✅ Done | Custom Tailwind font config |
| Custom animations (float, glow, shimmer, bounce) | ✅ Done | Tailwind keyframes |
| Glassmorphism/neumorphism design tokens | ✅ Done | |

---

## 🚧 Phase 2 — Tally Prime ERP Integration (ACTIVE)

### 2A. Prerequisites & Discovery
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Document ANUJ's stock naming convention | ✅ Done | 🔴 Critical | 21 stock items extracted via XML API. Pattern: `[TYPE] [SIZE] [BRAND] [CODE] [SHADE] PRE [TILES/BOX]` |
| Get Tally Cloud endpoint URL + port | ✅ Done | 🔴 Critical | Elcom Digital cloud → VCC tunnel → `localhost:9000` |
| Get sample stock item XML export from Tally | ✅ Done | 🔴 Critical | `List of Stock Items` COLLECTION export confirmed working |
| Get ANUJ's ledger structure | ✅ Done | 🔴 Critical | Test company "Tylgo" created. Sales Account + customer ledger created via API |
| Verify VCC tunnel connectivity | ✅ Done | 🔴 Critical | Confirmed: PowerShell → localhost:9000 → VCC → Elcom → TallyPrime |
| Verify XML import format | ✅ Done | 🔴 Critical | `Import Data` with `IMPORTDATA/REQUESTDESC/REQUESTDATA` structure confirmed |
| Create Sales Voucher via API (proof of concept) | ✅ Done | 🔴 Critical | `CREATED=1, LASTVCHID=1, ERRORS=0` — invoice created in Tally from CLI |

### 2B. Database & SKU Mapping
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| `tally_stock_mappings` table | ✅ Done | 🔴 Critical | Migration applied. tile_id ↔ tally_stock_item_name with RLS |
| `tally_sync_log` table | ✅ Done | 🔴 Critical | Audit trail with request/response payloads, RLS enabled |
| `stock_quantity` + `last_stock_sync` on tiles | ✅ Done | 🔴 Critical | Columns added via migration |
| `tally_sync_status` + tracking on quotations | ✅ Done | 🔴 Critical | status, voucher_number, error, synced_at columns added |
| Admin UI for SKU mapping management | ⬜ Not Started | 🟡 Medium | Map each Tylgo tile to its Tally stock item name |
| Bulk import mappings | ⬜ Not Started | 🟢 Low | CSV/Excel upload for initial mapping |

### 2C. Stock Sync (Tally → Tylgo)
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| XML export builder (stock items, ledgers) | ✅ Done | 🔴 Critical | `buildExportXml()` in `tallyXmlBuilder.ts` |
| XML response parsers | ✅ Done | 🔴 Critical | `parseStockItemsResponse()`, `parseLedgerNamesResponse()` |
| Edge Function: `tally-sync-stock` | ⬜ Not Started | 🟡 Medium | Will use relay pattern, not edge function (VCC is local) |
| Scheduled sync (relay-based) | ⬜ Not Started | 🟡 Medium | Relay already polls — add stock pull on interval |
| Stock display in admin dashboard | ⬜ Not Started | 🟡 Medium | Show current stock per tile |
| Low stock alerts | ⬜ Not Started | 🟢 Low | Notify admin when stock drops below threshold |

### 2D. Sales Voucher Push (Tylgo → Tally)
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| XML voucher builder | ✅ Done | 🔴 Critical | `buildSalesVoucherXml()` in `tallyXmlBuilder.ts` — confirmed working format |
| Ledger creation builder | ✅ Done | 🔴 Critical | `buildCreateLedgerXml()` — auto-creates customer parties |
| Response parser | ✅ Done | 🔴 Critical | `parseTallyImportResponse()` — extracts CREATED/ERRORS/LASTVCHID |
| Node.js Relay Service | ✅ Done | 🔴 Critical | `tally-relay/index.js` — polls Supabase, pushes to Tally |
| Queue + retry logic | ✅ Done | 🔴 Critical | Status lifecycle: pending → queued → synced/failed, with retry |
| Tally voucher ID stored on quotation | ✅ Done | 🔴 Critical | `tally_voucher_number` column, updated by relay on success |
| Error handling & logging | ✅ Done | 🔴 Critical | Errors logged to `tally_sync_log` + displayed in UI |
| `useTallySync` hook | ✅ Done | 🔴 Critical | Queue, retry, ignore mutations + pending/log queries |
| "Send to Billing" button on QuotationDetails | ✅ Done | 🔴 Critical | With status badge, error display, retry button |

### 2E. Sync Dashboard & Monitoring
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Tally sync status on QuotationDetails | ✅ Done | 🟡 Medium | Badge + voucher number + error message |
| Failed sync retry button | ✅ Done | 🟡 Medium | "Retry Sync" button when status = failed |
| Sync status dashboard (admin) | ⬜ Not Started | 🟡 Medium | Dedicated page with sync log table |
| Manual sync trigger button | ⬜ Not Started | 🟡 Medium | Admin can force a stock sync |
| Price sync (Tally → Tylgo) | ⬜ Not Started | 🟢 Low | Optional: pull MRP from Tally |

---

## 🔜 Phase 3 — Public E-Commerce (Planned)

### 3A. Public Storefront
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Public tile/product browsing (no auth) | ⬜ Not Started | 🔴 High | Customers browse catalog on `{showroom}.tylgo.store` |
| Tile detail pages (public) | ⬜ Not Started | 🔴 High | Size, price, images, stock availability |
| Product detail pages (public) | ⬜ Not Started | 🔴 High | |
| Category/filter/search (public) | ⬜ Not Started | 🔴 High | By size, type, price range, color |
| Responsive storefront layout | ⬜ Not Started | 🔴 High | Mobile-first |
| SEO meta tags per product | ⬜ Not Started | 🟡 Medium | |

### 3B. Customer Auth
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Customer registration (phone/email) | ⬜ Not Started | 🔴 High | New role: `customer` in profiles |
| Customer login | ⬜ Not Started | 🔴 High | |
| OTP-based phone verification | ⬜ Not Started | 🟡 Medium | Indian market — phone is primary |
| Guest checkout (no login required) | ⬜ Not Started | 🟡 Medium | Reduces friction |

### 3C. Shopping Cart & Checkout
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Add to cart (tiles — specify boxes/qty) | ⬜ Not Started | 🔴 High | |
| Cart persistence (localStorage + DB) | ⬜ Not Started | 🔴 High | Guest = localStorage, logged in = DB |
| Cart summary with pricing | ⬜ Not Started | 🔴 High | |
| Checkout flow (address, delivery) | ⬜ Not Started | 🔴 High | |
| Payment integration (Razorpay) | ⬜ Not Started | 🔴 High | Indian market — Razorpay is standard |
| Order confirmation & receipt | ⬜ Not Started | 🔴 High | |
| Wishlist / favorites | ⬜ Not Started | 🟢 Low | |
| Product reviews & ratings | ⬜ Not Started | 🟢 Low | |

## 🔜 Phase 4 — Custom Room Visualizer (Planned)

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Room dimension input (customer-facing) | ⬜ Not Started | 🔴 High | Input length × breadth × height |
| Tile selection for visualization | ⬜ Not Started | 🔴 High | Browse and pick tiles |
| 2D room tile preview | ⬜ Not Started | 🔴 High | Show tile pattern on floor/wall |
| 3D room visualization | ⬜ Not Started | 🟡 Medium | Three.js / WebGL room render |
| Save & share room designs | ⬜ Not Started | 🟡 Medium | |
| "Order this design" flow | ⬜ Not Started | 🟡 Medium | Direct to cart from visualizer |
| AR preview (stretch goal) | ⬜ Not Started | 🟢 Low | Mobile AR tile preview |

## 🔜 Phase 5 — Order & Delivery Management (Planned)

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Order management dashboard (admin) | ⬜ Not Started | 🔴 High | |
| Inventory stock tracking | ⬜ Not Started | 🔴 High | Real-time stock per SKU |
| Delivery scheduling | ⬜ Not Started | 🟡 Medium | |
| Invoice generation | ⬜ Not Started | 🟡 Medium | Convert quotation → invoice |
| Return/refund management | ⬜ Not Started | 🟢 Low | |
| Delivery partner integration | ⬜ Not Started | 🟢 Low | |

---

## 🐛 Known Issues & Tech Debt

| Issue | Severity | Notes |
|-------|----------|-------|
| `types.ts` is empty | ✅ Fixed | Created `src/types/` directory with 8 centralized type files |
| `.env` not in `.gitignore` | ✅ Fixed | Removed hardcoded keys from client.ts, verified .gitignore |
| Supabase keys hardcoded in `client.ts` | ✅ Fixed | Replaced with `import.meta.env` |
| `useUnifiedPDFGeneration.tsx` is 33KB | ✅ Fixed | Extracted HTML generation to `src/utils/pdf/pdfGenerators.ts` |
| `TileSelectionStep.tsx` is 62KB | ✅ Fixed | Decomposed into 8 focused modules: orchestrator (593L), state hook, FloorRoomsCard, WallRoomsCard, TileSelectionSummary, TileSelectionDialogs |
| `TileManagement.tsx` (admin) is 48KB | ✅ Fixed | Extracted TileFormDialog, reduced size by 50% |
| Tile calc logic duplicated 3 times | ✅ Fixed | Unified in `src/utils/calculations/quotationItemCalculator.ts` |
| Root-level refactoring junk files | ✅ Fixed | Deleted 5 Python/text files from project root |
| Duplicate Toaster components | ✅ Fixed | Removed custom Toaster, standardized on Sonner |
| SeedUsers route in production | ✅ Fixed | Gated behind `import.meta.env.DEV` |
| No structured logging | ✅ Fixed | Created `src/utils/logger.ts` with env-gated log levels |
| Supabase SELECT strings copy-pasted 4× | ✅ Fixed | Extracted to `src/utils/queries/quotationSelectFields.ts` |
| Some hooks use `any` types | 🟡 Medium | 74 remaining (down from 120+). All error: any eliminated. Remaining are Supabase table casts and PDF/calc logic |
| No automated tests | 🟡 Medium | Zero test coverage |
| No CI/CD pipeline | 🟡 Medium | Only Vercel auto-deploy |
| `lovable-tagger` in devDependencies | 🟢 Low | Artifact from Lovable.dev scaffolding, can be removed |

---

## 📈 Database Schema Summary

### Core Tables
| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (linked to `auth.users`) |
| `brands` | Tile brands/companies |
| `showrooms` | Physical showroom locations (belong to brands) |
| `customers` | Customer records (belong to showrooms) |
| `tiles` | Tile catalog (belong to brands) |
| `rooms` | Room dimensions (belong to customers) |
| `staircases` | Staircase specs (belong to customers) |
| `quotations` | Price quotations (belong to customers) |
| `quotation_items` | Line items in quotations |
| `products` | Non-tile products (belong to brands) |
| `room_product_selections` | Product-to-room assignments |
| `customer_products` | Product-to-customer assignments |
| `tally_stock_mappings` | Tylgo tile ↔ Tally stock item name mapping |
| `tally_sync_log` | Audit trail for all Tally sync operations |

### Key Relationships
```
Brand (1) ──→ (N) Showrooms
Showroom (1) ──→ (N) Profiles (users)
Showroom (1) ──→ (N) Customers
Customer (1) ──→ (N) Rooms
Customer (1) ──→ (N) Staircases
Customer (1) ──→ (N) Quotations
Quotation (1) ──→ (N) Quotation Items
Brand (1) ──→ (N) Tiles
Brand (1) ──→ (N) Products
Tile (1) ──→ (1) Tally Stock Mapping
```

### Supabase Edge Functions
| Function | Purpose |
|----------|---------|
| `admin-create-worker` | Securely create worker accounts (bypasses client-side auth) |
| `admin-reset-password` | Admin-initiated password resets |
| `generate-quotation-pdf` | Server-side quotation PDF generation |
| `generate-tiles-pdf` | Server-side tile catalogue PDF generation |
| `send-quotation-email` | Email delivery for quotations |

---

## 📝 Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-05-05 | Phase 2 Tally integration: VCC tunnel verified, XML API format confirmed, migration applied, XML builder + relay script + useTallySync hook + QuotationDetails UI built | Lyra (AI) |
| 2026-05-04 | Phase 2 refocused to Tally Prime integration only. E-commerce → Phase 3, Visualizer → Phase 4, Orders → Phase 5 | Lyra (AI) |
| 2026-04-24 | Phase 1 marked COMPLETE. Phase 2 expanded with Tally integration, storefront, cart, checkout, order mgmt | Lyra (AI) |
| 2026-04-24 | Phase 4: TileSelectionStep decomposition (1,397→593L), error:any elimination (20 instances) | Lyra (AI) |
| 2026-04-24 | Refactoring Phase 1+3: Centralized types, unified calculator, logger, cleanup | Lyra (AI) |
| 2026-04-24 | Initial MASTER_TRACKER created from full codebase analysis | Lyra (AI) |
