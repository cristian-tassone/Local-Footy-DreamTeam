# Local Footy DreamTeam

A local-footy fantasy team builder (MPFNL — Mornington Peninsula Football Netball League) using Premier Data **Ranking Points** as the scoring source. Single-file front-end web app, with the player market served live from **Supabase**.

## Game format
- Pick a **7-player** team: Defence, Ruck, 2× Midfield, Forward, 2× Swingmen (any position).
- **$3,000,000** salary cap.
- **One player per club** max.
- **Max 3 midfielders** across the whole team (incl. swingmen).
- Pick a **captain** (double points).
- Prices derived from RP average: `Price = (RP / 150) × 730,000`, rounded to nearest $5,000.

## Data
Players are loaded at runtime from the Supabase `players` table (read-only, ordered by season average). The client uses the **publishable/anon key** only, with Row Level Security and a public SELECT policy — no secret key, no writes.

Player fields used: `name, club, division, position, season_average, last_round, price, break_even, games_played`.

## Running it
It needs to be served (it fetches over the network), e.g.:

```
node preview-static.js          # serves on http://localhost:8090
```

## Files
- `index.html` — the app (UI, team-building logic, Supabase fetch).
- `preview-static.js` — tiny static file server for local / LAN preview.
- `import-mpfnl.js`, `parse-xlsx.js`, `import-players.js` — offline tooling to parse source spreadsheets (backup / seeding only; the live app reads from Supabase).
