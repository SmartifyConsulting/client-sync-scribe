-- Rename the user_role enum values to wealth-native names. profiles.role
-- is also of type user_role (not a separate text column), so this single
-- rename auto-relabels existing rows in both user_roles and profiles.
ALTER TYPE user_role RENAME VALUE 'doctor' TO 'broker';
ALTER TYPE user_role RENAME VALUE 'patient' TO 'client';
