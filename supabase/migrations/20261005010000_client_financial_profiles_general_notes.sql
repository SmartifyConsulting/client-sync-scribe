-- Meeting commentary that doesn't map to any structured Needs Analysis field
-- (cash flow, assets, risk, investments, goals, estate) is kept here instead
-- of being silently dropped by the AI extraction.
ALTER TABLE public.client_financial_profiles
  ADD COLUMN IF NOT EXISTS general_notes text;
