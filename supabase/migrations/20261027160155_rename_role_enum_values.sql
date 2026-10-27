-- Rename the user_role enum values to wealth-native names. This
-- auto-updates every existing row in user_roles (enum rename is a label
-- change, not a data migration, for columns of this enum type).
ALTER TYPE user_role RENAME VALUE 'doctor' TO 'broker';
ALTER TYPE user_role RENAME VALUE 'patient' TO 'client';

-- profiles.role is a SEPARATE plain-text column (not the user_role enum)
-- that useUserRole() actually prioritizes over user_roles. Existing rows
-- must be migrated by hand or every current broker/client with a set
-- profiles.role would resolve to the old role name after this deploy.
UPDATE profiles SET role = 'broker' WHERE role = 'doctor';
UPDATE profiles SET role = 'client' WHERE role = 'patient';
