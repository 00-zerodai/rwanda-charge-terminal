## Rename app from "ChargeFinder" to "Volta"

Update all user-facing references to the new brand name "Volta" across HTML metadata, PWA manifest, and React components. Tagline "Rwanda · EV stations" stays the same.

### Files to update

1. **`index.html`**
   - `<title>`: "Volta — EV Charging Terminal"
   - Meta description, author, OG title/description
   - `apple-mobile-web-app-title`: "Volta"

2. **`public/manifest.webmanifest`**
   - `name`: "Volta"
   - `short_name`: "Volta"
   - `description`: "Find real EV charging stations across Rwanda."

3. **`src/pages/Index.tsx`**
   - Header `<h1>`: "Volta"

4. **`src/components/MockLogin.tsx`** — replace ChargeFinder branding with Volta

5. **`src/components/InstallPrompt.tsx`** — update install prompt copy ("Install Volta", etc.)

6. **`src/components/ApiKeyGate.tsx`** — update any branding text

7. **`src/index.css`** — update if a brand string appears in a comment/content rule

### Out of scope
- Logo/icon artwork (keep existing Zap mark and PNG icons)
- Domain, repo name, or Lovable project name
- Color scheme

### Notes
- After rename, users who already installed the PWA will keep the old name on their home screen until they reinstall — expected behavior.