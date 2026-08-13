UPDATE auth.users
SET encrypted_password = crypt('MagnumP1-1945*', gen_salt('bf')),
    updated_at = now()
WHERE lower(email) = 'sme@smartify.co.za';