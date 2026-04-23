# Documents feature

Owns clinical documents: invoices, prescriptions, medical certificates, referral letters, general letters, and templates.

Will eventually contain:
- `components/` — moved from `src/components/documents/`, `src/components/templates/`
- `lib/` — `fillDocumentPlaceholders`, `invoiceHtml`, `paidInvoice`, `resolveDocumentPreviewContent`
- `utils/` — `documentExport`, `documentFormatting`
- `hooks/` — `useDocuments`, `useTemplates`, `useHeaderFooterTemplates`
- `services/` — document-specific Supabase queries

The recent document resolver fixes (Phase 0) live in `src/lib/resolveDocumentPreviewContent.ts` and will move here in Phase 3 with a re-export shim.
