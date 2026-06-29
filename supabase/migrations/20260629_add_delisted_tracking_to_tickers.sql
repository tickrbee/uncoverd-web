-- Delisting tracking on backend.tickers — the survivorship-bias foundation.
-- Going forward we record WHEN a symbol leaves the market (from FMP
-- /delisted-companies, populated by the refresh-fmp-data `delisted` stage)
-- instead of silently keeping only survivors. NULL delisted_date = still listed.
-- Applied to prod via Supabase apply_migration on 2026-06-29; mirrored here for VCS.

ALTER TABLE backend.tickers
  ADD COLUMN IF NOT EXISTS delisted_date date,
  ADD COLUMN IF NOT EXISTS delisted_reason text;

COMMENT ON COLUMN backend.tickers.delisted_date IS 'Date the symbol was delisted (from FMP /delisted-companies). NULL = still listed. Survivorship-bias tracking foundation.';
COMMENT ON COLUMN backend.tickers.delisted_reason IS 'Source/reason tag for delisting, e.g. fmp_delisted.';

-- Partial index so "what delisted" / survivorship queries stay cheap.
CREATE INDEX IF NOT EXISTS idx_tickers_delisted_date
  ON backend.tickers (delisted_date)
  WHERE delisted_date IS NOT NULL;
