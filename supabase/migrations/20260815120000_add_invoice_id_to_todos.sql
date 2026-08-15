-- Links a to-do item to a specific invoice so "Mark invoice as paid" on the
-- to-do list's row action menu can update the exact invoice, instead of
-- guessing by patient/title match.
ALTER TABLE public.todos
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;
