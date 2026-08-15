-- Don't notify the admin on logins from the seeded test/demo profiles (the
-- ones in the avatar switcher) — otherwise routine dev/demo use and
-- profile-switching would flood georgia.adams@smartify.co.za with noise.
-- Signup notifications are unaffected.
CREATE OR REPLACE FUNCTION public.notify_admin_on_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF lower(new.email) = ANY (ARRAY[
    'info@georgiaadams.co.za',
    'georgia.adams@smartify.co.za',
    'sme@smartify.co.za',
    'projectmanager@smartify.co.za',
    'hospital.test@holarchealth.com',
    'renken@smartify.co.za',
    'er.test@holarchealth.com',
    'ifeanyi.okoli@greenoriagroup.com',
    'dr.buttons@smartify.co.za',
    '2348167581572@phone.holarc.local',
    'nurse.test@holarchealth.com'
  ]) THEN
    RETURN new;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://lqnnrvvrjscjceswpfal.supabase.co/functions/v1/notify-admin-auth-event',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', 'holarc-admin-notify-8f2c'),
      body := jsonb_build_object(
        'type', 'login',
        'email', new.email,
        'full_name', new.raw_user_meta_data ->> 'full_name'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- never block login on a notification failure
  END;
  RETURN new;
END;
$function$;
