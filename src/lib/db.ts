import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = process.env.DB_PATH || './data/orders.db';
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL'); // lezers en schrijvers blokkeren elkaar niet
db.pragma('busy_timeout = 5000'); // wacht max 5s op een lock i.p.v. direct falen
db.pragma('synchronous = NORMAL'); // veilig in WAL, sneller bij schrijfpieken
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id              TEXT PRIMARY KEY,
    created_at      TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',
    klanttype       TEXT NOT NULL,            -- 'particulier' | 'zakelijk'
    naam            TEXT NOT NULL,            -- (contact)persoon
    email           TEXT NOT NULL,
    telefoon        TEXT,
    bedrijfsnaam    TEXT,                     -- alleen zakelijk
    kvk             TEXT,                     -- niet meer gevraagd (behouden voor historie)
    straat          TEXT,                     -- zakelijk: factuuradres
    postcode        TEXT,
    plaats          TEXT,
    opmerking       TEXT,
    ophaal_type     TEXT,                     -- leeg bij alleen-donatie
    ophaal_label    TEXT,                     -- momentopname t.b.v. historie
    ophaal_iso      TEXT,
    subtotaal_cent  INTEGER NOT NULL DEFAULT 0,
    totaal_cent     INTEGER NOT NULL DEFAULT 0,
    mollie_id       TEXT,
    betaald_op      TEXT
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id    TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  TEXT NOT NULL,
    naam        TEXT NOT NULL,
    stukprijs_cent INTEGER NOT NULL,
    aantal      INTEGER NOT NULL,
    regel_cent  INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_orders_ophaal ON orders(ophaal_iso);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);
`);
