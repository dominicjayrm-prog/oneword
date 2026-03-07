-- =============================================
-- Daily cron job to auto-run seed submissions
-- Calls the run-daily-seeds edge function every day at 00:05 UTC
-- =============================================

-- Enable pg_cron and pg_net extensions (needed for HTTP calls from cron)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule: every day at 00:05 UTC (5 mins after midnight to ensure daily_words has rolled over)
SELECT cron.schedule(
  'run-daily-seeds',
  '5 0 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/run-daily-seeds',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}',
    timeout_milliseconds := 30000
  );
  $$
);

-- NOTE: You need to set these app settings in your Supabase dashboard:
--   Dashboard > Project Settings > Database > App Settings
--   supabase_url = https://nqqzxwchnhonhqyljdrk.supabase.co
--   service_role_key = <your service role key>
--
-- ALTERNATIVE: If app settings don't work, you can hardcode the URL:
-- Replace the SELECT above with:
--
-- SELECT cron.schedule(
--   'run-daily-seeds',
--   '5 0 * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://nqqzxwchnhonhqyljdrk.supabase.co/functions/v1/run-daily-seeds',
--     headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
--     body := '{}',
--     timeout_milliseconds := 30000
--   );
--   $$
-- );
