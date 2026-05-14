-- Phase 2: Tally Integration Schema

-- 1. Create tally_stock_mappings table
CREATE TABLE IF NOT EXISTS tally_stock_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tile_id UUID REFERENCES tiles(id) ON DELETE CASCADE,
    tally_stock_item_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tile_id),
    UNIQUE(tally_stock_item_name)
);

-- RLS for tally_stock_mappings
ALTER TABLE tally_stock_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on tally_stock_mappings" 
    ON tally_stock_mappings FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
        )
    );

CREATE POLICY "Workers can read tally_stock_mappings"
    ON tally_stock_mappings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid()
        )
    );

-- 2. Add stock and tally tracking to tiles
ALTER TABLE tiles ADD COLUMN IF NOT EXISTS stock_quantity NUMERIC DEFAULT 0;
ALTER TABLE tiles ADD COLUMN IF NOT EXISTS last_stock_sync TIMESTAMPTZ;

-- 3. Add tally tracking to quotations
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tally_sync_status TEXT DEFAULT 'pending' CHECK (tally_sync_status IN ('pending', 'queued', 'synced', 'failed', 'ignored'));
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tally_voucher_number TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tally_sync_error TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tally_synced_at TIMESTAMPTZ;

-- 4. Create tally_sync_log table
CREATE TABLE IF NOT EXISTS tally_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    sync_type TEXT NOT NULL CHECK (sync_type IN ('stock_pull', 'voucher_push')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failure')),
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    raw_request_payload TEXT,
    raw_response_payload TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for tally_sync_log
ALTER TABLE tally_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on tally_sync_log" 
    ON tally_sync_log FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
        )
    );
