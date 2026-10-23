# Uitrol op Plesk via GitHub

Deze site draait als **Node.js-app** op Plesk. Je zet hem één keer op; daarna
rol je wijzigingen uit door ze naar GitHub te pushen (of direct in de
GitHub-webeditor aan te passen) — Plesk haalt ze op, bouwt en herstart.

## Eenmalige setup

### 1. Node.js-extensie
Zorg dat in Plesk de **Node.js**-extensie beschikbaar is voor het domein
(Node 22.23 of hoger; wij gebruiken 24). Het domein moet publiek op **https** staan (nodig voor de
Mollie-webhook).

### 2. Git koppelen
Plesk → **Websites & Domains → (jouw domein) → Git**:
- Repository: `https://github.com/roodlicht/rotary-santa-krans` (publiek, dus geen inlog nodig)
- Branch: `main`
- Deployment directory: `/httpdocs`
- Deployment mode: `Automatic`
- **Enable post deployment actions** aan, met: `bash deploy.sh`

> **Privé-repo?** Plesk toont bij het koppelen een **deploy key** (publieke
> SSH-sleutel). Kopieer die naar GitHub → repo → **Settings → Deploy keys →
> Add deploy key** (alleen-lezen is voldoende). Gebruik dan de SSH-URL
> (`git@github.com:<account>/rotary-santa-krans.git`). Bij een publieke repo
> kun je gewoon de https-URL gebruiken zonder sleutel.

### 3. Node.js-app instellen
Plesk → **Node.js** (bij hetzelfde domein):
- **Node.js-versie**: 24 (moet gelijk zijn aan `.node-version`)
- **Document Root**: `/httpdocs/dist/client` (alleen publieke bestanden; zo
  serveert de webserver nooit `package.json`, `deploy.sh` of de broncode)
- **Application Root**: `/httpdocs` (let op: Plesk schuift dit mee als je de
  Document Root wijzigt; zet het daarna terug)
- **Application Startup File**: `dist/server/entry.mjs`
- **Application Mode**: `production`

> Staat de Node.js-tegel niet bij Dev Tools? Dan moet Node.js nog aan voor
> het abonnement: Subscriptions → domein → Customize → Node.js aanvinken.

### 4. Omgevingsvariabelen
Bij de Node.js-instellingen → **Custom environment variables**. Zie
`.env.example`; voor productie minimaal:

| Variabele | Waarde |
| --- | --- |
| `SITE_URL` | `https://www.<jouwdomein>.nl` (definitieve URL) |
| `MOLLIE_API_KEY` | je **live** Mollie-key (leeg = testmodus-simulator) |
| `ADMIN_PASSWORD` | wachtwoord voor `/beheer` |
| `SESSION_SECRET` | lange willekeurige tekst |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | mailserver voor facturen |
| `DB_PATH` | **aanrader:** een pad buiten de repo, bijv. `/var/www/vhosts/<domein>/private/santakrans.db`, zodat de bestellingen-database nooit door een uitrol wordt geraakt |

### 5. Bouwstap bij elke uitrol
Plesk → Git → **Additional deployment actions** (of "Deployment actions"):
```
bash deploy.sh
```
Dit draait `npm ci`, `npm run build` en herstart de Node-app (via
`tmp/restart.txt`). Zie `deploy.sh`.

Deze server gebruikt **nodenv** voor Node. In de deploy-shell staan de
nodenv-shims niet vanzelf op PATH en is er geen versie gekozen; `deploy.sh`
regelt beide (shims op PATH, versie uit `.node-version`). Handmatig bouwen via
SSH: `export NODENV_VERSION=24` en dan `npm ci && npm run build`.

### 6. Eerste uitrol
1. In Plesk → Git: klik **Pull / Deploy** (haalt de code op en draait `deploy.sh`).
2. In Plesk → Node.js: klik **Enable Node.js** / **Restart App**.
3. Open het domein — de site hoort te draaien.
4. Controleer `/beheer` (met je `ADMIN_PASSWORD`). Zie je "Beheer is nog niet
   ingesteld", dan ontbreken `ADMIN_PASSWORD` of `SESSION_SECRET`.

### Cloudflare
Het domein loopt via Cloudflare. Zet SSL/TLS op **Full** (bij **Flexible**
ontstaat een eindeloze redirect-loop). Na een Let's Encrypt-certificaat in
Plesk kun je naar **Full (strict)**.

De Mollie-webhook (`/api/webhook/mollie`) wordt automatisch meegestuurd; er is
geen aparte configuratie in het Mollie-dashboard nodig, zolang het domein
publiek op https bereikbaar is.

## E-mail (facturen en contactformulier)
De mail van het domein draait op deze Plesk-server zelf (MX, SPF en DKIM
wijzen hierheen). De app geeft mail via SMTP aan de lokale mailserver:

| Variabele | Waarde |
| --- | --- |
| `SMTP_HOST` | `127.0.0.1` |
| `SMTP_PORT` | `25` |
| `SMTP_FROM` | `Rotary Santa Krans <support@rotarykerstkrans.nl>` |

Geen wachtwoord nodig, maar de server moet op de **witte lijst** van de
mailserver staan: Tools & Settings → Mail Server Settings → White List →
`127.0.0.1/8`. Zonder die regel weigert de mailserver mail naar andere
domeinen ("Relay access denied") en krijgen klanten geen factuur.

Niet `MAIL_VIA=sendmail` op deze server: SELinux verbiedt het
sendmail-hulpprogramma van Plesk om de aanroepende webapp uit te lezen. De
mail gaat dan wel de deur uit, maar de site krijgt een foutcode en meldt
"versturen mislukt" (met dubbele mails als bezoekers het opnieuw proberen).

Bij elke betaalde bestelling gaat er ook een melding naar support@ (uit te
zetten via `meldingen` in `src/config/site.ts`). Zorg dat `support@rotarykerstkrans.nl`
bestaat in Plesk → Mail (mailbox of doorsturen), want daar komen de
contactberichten en antwoorden op facturen binnen.

Zonder werkende mail krijgt een bezoeker bij het contactformulier een
foutmelding met het e-mailadres; een factuur kan later opnieuw worden
verstuurd via /factuur-opvragen.

## Mollie aanzetten
De sleutel staat **nooit** in de code (de repo is publiek), alleen in Plesk:
Node.js → **Custom environment variables** → `MOLLIE_API_KEY` → **Restart App**.

1. Eerst je **testsleutel** (`test_…`, Mollie-dashboard → Developers → API keys).
   Doe een proefbestelling: je komt in Mollies testscherm, kies daar "Paid".
   Controleer dat de bedankpagina "Betaling gelukt" toont en dat de bestelling
   in `/beheer` staat.
2. Werkt dat, vervang hem door je **live-sleutel** (`live_…`) en herstart.
3. Maak vóór de echte start de proefbestellingen leeg (databasebestand op
   `DB_PATH` verwijderen, app herstarten), zodat de nummering bij 0001 begint.

Welke betaalmethodes klanten zien (iDEAL, Wero) bepaal je in het
Mollie-dashboard; de site toont alles wat daar aan staat.

## Later wijzigingen doorvoeren

Bijna alles wat je per jaar aanpast staat in **`src/config/site.ts`**: prijzen,
besteldeadlines, afhaaldata/-tijden, clubnaam, het goede doel en de
factuurafzender.

1. Pas `src/config/site.ts` aan — lokaal, of direct op GitHub (potlood-icoon →
   bewerken → commit).
2. De **Build check** (GitHub Actions) bouwt automatisch mee; blijft die groen,
   dan is je wijziging foutloos.
3. Plesk → Git → **Pull now** (zonder GitHub-webhook ziet Plesk een push niet vanzelf). `deploy.sh`
   bouwt opnieuw met de nieuwe waarden en herstart de app.

> Let op: na een wijziging in de config is een **nieuwe uitrol (build) nodig**;
> de waarden worden tijdens het bouwen ingebakken. Een push + deploy regelt dat.

## Database & back-ups
De bestellingen staan in één SQLite-bestand (`DB_PATH`, standaard
`data/orders.db`). Back-up = dat bestand kopiëren. Zet `DB_PATH` bij voorkeur
buiten de repo-map (stap 4) zodat een uitrol het nooit overschrijft.

## Nieuw seizoen
Pas `src/config/site.ts` aan (jaartal, prijzen, data). Wil je met een schone
bestellijst beginnen, maak dan eerst een back-up van de database en verwijder
daarna het databasebestand; de app maakt bij de eerstvolgende start een lege aan.
