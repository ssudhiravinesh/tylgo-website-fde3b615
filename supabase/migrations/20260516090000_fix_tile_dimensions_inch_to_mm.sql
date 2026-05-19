-- ──────────────────────────────────────────────────────────────────────────────
-- Migration: fix_tile_dimensions_inch_to_mm
-- Date     : 2026-05-16
--
-- Root cause: tile catalog was imported from an inches-based spreadsheet with
-- the naive conversion factor 1 inch = 25.4mm (rounded to nearest integer),
-- producing non-standard ANUJ sizes.
--
-- Standard sizes per ANUJ Tiles:
--   Wall : 1200×600, 450×300, 600×300
--   Floor: 600×600, 1200×600, 1600×800, 400×400, 300×300
-- ──────────────────────────────────────────────────────────────────────────────

-- 457×305 → 450×300  (18"×12" → standard wall)  affects ~619 tiles
UPDATE tiles
SET size_length = 450, size_breadth = 300
WHERE size_length = 457 AND size_breadth = 305;

-- 305×305 → 300×300  (12"×12" → standard floor)  affects ~237 tiles
UPDATE tiles
SET size_length = 300, size_breadth = 300
WHERE size_length = 305 AND size_breadth = 305;

-- 406×406 → 400×400  (16"×16" → standard floor)  affects ~44 tiles
UPDATE tiles
SET size_length = 400, size_breadth = 400
WHERE size_length = 406 AND size_breadth = 406;

-- 610×305 → 600×300  (24"×12" → standard wall)  affects ~23 tiles
UPDATE tiles
SET size_length = 600, size_breadth = 300
WHERE size_length = 610 AND size_breadth = 305;

-- 305×610 → 600×300  (12"×24" → same tile, also normalizes length > breadth)  affects ~5 tiles
UPDATE tiles
SET size_length = 600, size_breadth = 300
WHERE size_length = 305 AND size_breadth = 610;

-- 800×1600 → 1600×800  (normalize: size_length is always the larger dimension)  affects ~25 tiles
UPDATE tiles
SET size_length = 1600, size_breadth = 800
WHERE size_length = 800 AND size_breadth = 1600;

-- 610×610 → 600×600  (24"×24" → standard floor)  affects ~1 tile
UPDATE tiles
SET size_length = 600, size_breadth = 600
WHERE size_length = 610 AND size_breadth = 610;

-- ── Confirmed specialty sizes (inch-origin, Anuj confirmed) ──────────────────

-- 914×305 → 900×300  (36"×12" → 900×300mm)  affects ~48 tiles
UPDATE tiles
SET size_length = 900, size_breadth = 300
WHERE size_length = 914 AND size_breadth = 305;

-- 1219×305 → 1200×300  (48"×12" → 1200×300mm)  affects ~10 tiles
UPDATE tiles
SET size_length = 1200, size_breadth = 300
WHERE size_length = 1219 AND size_breadth = 305;

-- 914×610 → 900×600  (36"×24" → 900×600mm)  affects ~4 tiles
UPDATE tiles
SET size_length = 900, size_breadth = 600
WHERE size_length = 914 AND size_breadth = 610;

-- 1219×610 → 1200×600  (48"×24" → 1200×600mm)  affects ~3 tiles
UPDATE tiles
SET size_length = 1200, size_breadth = 600
WHERE size_length = 1219 AND size_breadth = 610;

-- 1219×1219 → 1200×1200  (48"×48" → 1200×1200mm)  affects ~3 tiles
UPDATE tiles
SET size_length = 1200, size_breadth = 1200
WHERE size_length = 1219 AND size_breadth = 1219;

-- ── Verify ────────────────────────────────────────────────────────────────────
-- Run this to confirm results after applying:
-- SELECT size_length, size_breadth, COUNT(*) FROM tiles GROUP BY size_length, size_breadth ORDER BY size_length;
