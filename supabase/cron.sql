-- Run this once in the Supabase SQL editor AFTER the app is deployed.
-- It asks the app every 5 minutes to slice (charge) any split whose time has come.
-- Works on the free Supabase plan, so you don't need Vercel Pro cron.
--
-- Replace the two placeholders:
--   https://YOUR-APP.vercel.app  -> your deployed URL
--   YOUR_CRON_SECRET             -> the same value as CRON_SECRET in Vercel

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'sliced-slicer',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://YOUR-APP.vercel.app/api/cron/slice',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET', 'Content-Type', 'application/json'),
    body    := '{}'::jsonb
  );
  $$
);

-- To stop it later:  select cron.unschedule('sliced-slicer');
