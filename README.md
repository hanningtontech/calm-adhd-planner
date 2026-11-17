# The Calm ADHD Planner (web)

Static ADHD-friendly browser planner — companion to the printable product.

**Live public demo:** https://hanningtontech.github.io/calm-adhd-planner/

## Stack
HTML/CSS/ES modules · hash routes · `localStorage` · optional service-worker shell · GitHub Pages (`/docs`)

## Features
- Sections: Overview, Help, Backup, Today, Week, Month, Year, Brain dump, Projects, Home, Meals, Money, Well-being, Routines, Work, Goals, Notes
- Quick capture dock, gentle restart, optional due reminders
- Money: stretch total, currency display, payday/period, recurring monthly bills, spends, savings, optional debt
- Storage v2 with migration from v1; JSON backup with validation + confirm
- Public demo edition is limited; paid full edition is a separate offline zip for buyers (not published as a free download here)

## Privacy
Data stays in the browser. No bank sync. No account. See Backup & restore in-app.

## Accuracy note on printables
Expanded printable packs with “225 pages” include many **repeat blank worksheets**, not 225 unique designs.

## Develop
```bash
python3 -m http.server 3000 --directory docs
node docs/money.test.js
node docs/storage.test.js
```

## Deploy (GitHub Pages)
Push `main` with site files in `docs/`. Pages source: branch `main`, folder `/docs`.

## Limitations
- Offline shell works after first visit when SW registers (http/https). Not claimed for raw `file://`.
- Notifications require permission and an open/visited page — not a push server.
- Demo caps lists; do not treat the public URL as paid-only access.
