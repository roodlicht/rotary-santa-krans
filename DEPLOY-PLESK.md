# Uitrol op Plesk via GitHub

Deze site draait als **Node.js-app** op Plesk. Je zet hem één keer op; daarna
rol je wijzigingen uit door ze naar GitHub te pushen (of direct in de
GitHub-webeditor aan te passen) — Plesk haalt ze op, bouwt en herstart.

## Eenmalige setup

### 1. Node.js-extensie
Zorg dat in Plesk de **Node.js**-extensie beschikbaar is voor het domein
(Node 20 of hoger). Het domein moet publiek op **https** staan (nodig voor de
Mollie-webhook).

### 2. Git koppelen
Plesk → **Websites & Domains → (jouw domein) → Git**:
- Repository: `https://github.com/<jouw-account>/rotary-santa-krans.git`
- Branch: `main`
- Deployment-pad: bijvoorbeeld `santakrans` (een submap, niet `httpdocs`;
  we serveren via Node, niet via statische bestanden).
- Zet "automatisch uitrollen" aan als je wilt dat elke push meteen live gaat.

> **Privé-repo?** Plesk toont bij het koppelen een **deploy key** (publieke
> SSH-sleutel). Kopieer die naar GitHub → repo → **Settings → Deploy keys →
> Add deploy key** (alleen-lezen is voldoende). Gebruik dan de SSH-URL
> (`git@github.com:<account>/rotary-santa-krans.git`). Bij een publieke repo
> kun je gewoon de https-URL gebruiken zonder sleutel.

### 3. Node.js-app instellen
Plesk → **Node.js** (bij hetzelfde domein):
- **Application Root**: hetzelfde pad als het Git-deployment-pad.
- **Application Startup File**: `dist/server/entry.mjs`
- **Application Mode**: `production`
- **Node.js-versie**: 20 of hoger.

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

### 6. Eerste uitrol
1. In Plesk → Git: klik **Pull / Deploy** (haalt de code op en draait `deploy.sh`).
2. In Plesk → Node.js: klik **Enable Node.js** / **Restart App**.
3. Open het domein — de site hoort te draaien.
4. Controleer `/beheer` (met je `ADMIN_PASSWORD`).

De Mollie-webhook (`/api/webhook/mollie`) wordt automatisch meegestuurd; er is
geen aparte configuratie in het Mollie-dashboard nodig, zolang het domein
publiek op https bereikbaar is.

## Later wijzigingen doorvoeren

Bijna alles wat je per jaar aanpast staat in **`src/config/site.ts`**: prijzen,
besteldeadlines, afhaaldata/-tijden, clubnaam, het goede doel en de
factuurafzender.

1. Pas `src/config/site.ts` aan — lokaal, of direct op GitHub (potlood-icoon →
   bewerken → commit).
2. De **Build check** (GitHub Actions) bouwt automatisch mee; blijft die groen,
   dan is je wijziging foutloos.
3. Plesk rolt uit (automatisch bij een push, of klik **Deploy**). `deploy.sh`
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
