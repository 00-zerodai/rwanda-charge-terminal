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
