# Volta Rwanda Charge Terminal

## Run locally

1. Install Node.js (18 or newer).
2. Install dependencies with `npm install`.
3. Configure the Supabase URL and publishable key in `.env`:

   ```text
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

4. Apply the database migrations to the Supabase project. With the Supabase CLI linked to the project, run `npx supabase db push`; alternatively, run the migration SQL in the Supabase SQL editor.
5. In Supabase Authentication settings, enable email/password sign-in and configure the site URL and redirect URLs for the local and deployed app.
6. Start the app with `npm run dev`, then open `http://localhost:8080`.

The other available scripts are `npm run build`, `npm run preview`, `npm run lint`, and `npm test`.

## Community stations

Users need a Supabase account to submit stations. Submissions include GPS coordinates and a price in RWF and are shared on the map in real time. Station owners can open `/owner` (or choose **Owner portal** in the app) to add and remove stations belonging to their account. Database row-level security allows everyone to view community stations while restricting changes to the station's authenticated owner.

Owners can add up to five JPG, PNG, or WebP station photos (5 MB each) when creating a station. The `station-photos` public Supabase Storage bucket and owner-scoped upload/delete policies are configured by the `20261110162000_station_photos.sql` migration. Run all migrations before using station photo uploads.

## Station owner plans and driver activity

Station owners can set the total and currently available charging/service slots from the owner portal. When another signed-in user requests directions to a community station for the first time, Volta records one deduplicated direction event, adds an in-app owner notification, and sends an email. A direction request indicates interest; it does not prove that the driver arrived or charged. Direction events store station and driver account IDs only, not the driver's name or location.

Apply the migrations, deploy the email function, and configure a verified Resend sender:

```sh
npx supabase db push
npx supabase secrets set RESEND_API_KEY=your-resend-api-key RESEND_FROM_EMAIL="Volta <updates@your-verified-domain>"
npx supabase secrets set SITE_URL=https://voltarw.com
npx supabase functions deploy notify-station-direction
```

The function uses Supabase's injected `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` environment values. Email is only sent for the first direction request to a station; in-app notifications are stored in Supabase and are visible in the owner portal. If the email function or Resend is not configured, direction navigation still opens and the owner notification remains in the database.

Owners can select Starter (20,000 RWF/month), Pro Host (145,000 RWF/month), or Network (from 300,000 RWF/month) for each station. Plan selections are saved as pending payment only; they do not activate paid features or charge the owner. PawaPay checkout and automatic recurring billing are not implemented yet.
