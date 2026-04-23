# Ingestion service (placeholder)

Future entry point for raw-record ingestion pipelines (lab feeds, device data, third-party EHR imports).

Today this is a stub. Phase 6 will define `ingestRawRecord({ source, payload, patientId })` that:

1. validates the payload against a per-source schema
2. stores the **raw** record immutably (audit trail)
3. enqueues normalisation + AI insight extraction

No live wiring in Phase 1.
