-- Rename healthcare-named shared tables to wealth-native names.
-- patient_invoices intentionally excluded: zero live code references found,
-- likely dead — leaving it as-is pending a decision to drop it with the
-- rest of the unused-table cleanup rather than rename something unused.
ALTER TABLE patient_invitations RENAME TO client_invitations;
ALTER TABLE patient_hidden_doctors RENAME TO client_hidden_advisors;
ALTER TABLE referral_doctors RENAME TO referral_partners;
ALTER TABLE patient_profile_shares RENAME TO client_profile_shares;
ALTER TABLE doctor_access_requests RENAME TO advisor_access_requests;
ALTER TABLE doctor_patient_access RENAME TO broker_client_access;
