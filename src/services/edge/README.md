# Edge function services

Typed wrappers around `supabase.functions.invoke(...)`. All edge calls flow through `safeInvoke()` for consistent error shape (`{ data, error }`) and toast-friendly messages.

Phase 5 will adopt this wrapper incrementally.
