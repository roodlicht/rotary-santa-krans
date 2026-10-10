# Rotary Santa Krans — bestelsite

Bestelsite voor de kerstactie van de vier Rotary clubs van Breda: roomboter
kerstkransen en ambachtelijke kerststollen bestellen, doneren, betalen via
Mollie (iDEAL/Wero), automatische factuur per e-mail, beheerdashboard met
uitgiftelijst en export. Gebouwd met **Astro (SSR) + SQLite**, in de vormgeving
van het goedgekeurde prototype.

## Lokaal starten
```bash
npm install
cp .env.example .env     # ADMIN_PASSWORD/SESSION_SECRET invullen; Mollie mag leeg (testmodus)
npm run dev              # http://localhost:4321
```
In testmodus (geen MOLLIE_API_KEY) wordt de betaling gesimuleerd. Beheer: /beheer.

## Wat waar zit
| Wat | Bestand |
| --- | --- |
| Alles wat je per jaar aanpast (prijzen, deadlines, ophaalmomenten, clubs, factuurafzender) | `src/config/site.ts` |
| Home / Bestellen / Contact | `src/pages/index.astro`, `bestellen.astro`, `contact.astro` |
| Betaling + webhook + factuur mailen | `src/pages/api/checkout.ts`, `api/webhook/mollie.ts`, `src/lib/fulfil.ts` |
| Factuur-PDF (met logo) | `src/lib/invoice.ts` |
| Beheer / uitgifte / export | `src/pages/beheer/`, `src/pages/api/beheer/export.csv.ts` |
| Vormgeving + fonts/foto's | `src/styles/global.css`, `public/img`, `public/fonts` |
| Database | `data/orders.db` |

## Productie op Plesk
1. Node.js-extensie aanzetten (Node 20+); **app-processen = 1** (SQLite-schrijven).
2. Env vars: `MOLLIE_API_KEY`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `SITE_URL`, `SMTP_*`.
3. `npm install && npm run build`; startbestand `dist/server/entry.mjs` (Passenger).
4. Mollie-webhook (`/api/webhook/mollie`) gaat automatisch mee; domein moet publiek op https staan.
5. `data/` schrijfbaar houden.

## Belangrijke keuzes uit het prototype
- Twee producten à €17, donatie €12,50 per stuk.
- Ophaalmoment volgt uit particulier/zakelijk; elk met eigen besteldeadline.
- Zakelijk: bedrijfsnaam + contactpersoon + factuuradres verplicht (geen KvK), factuur op bedrijfsnaam.
- Na de deadline zijn producten geweigerd, doneren kan nog.
- Alleen iDEAL/Wero (geen creditcard); geen btw op de factuur.
