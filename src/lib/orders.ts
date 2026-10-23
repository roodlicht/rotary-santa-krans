import { randomBytes, timingSafeEqual } from 'node:crypto';
import { db } from './db';
import { producten, momenten, factuur, kransId, stolId, donatieId, type Klanttype } from '../config/site';

export type OrderInput = {
  klanttype: Klanttype;
  naam: string;
  email: string;
  telefoon?: string;
  bedrijfsnaam?: string;
  kvk?: string;
  straat?: string;
  postcode?: string;
  plaats?: string;
  opmerking?: string;
  aantallen: Record<string, number>; // { krans, stol, donatie }
};

export type OrderRow = {
  id: string;
  created_at: string;
  status: string;
  klanttype: string;
  naam: string;
  email: string;
  telefoon: string | null;
  bedrijfsnaam: string | null;
  kvk: string | null;
  straat: string | null;
  postcode: string | null;
  plaats: string | null;
  opmerking: string | null;
  ophaal_type: string | null;
  ophaal_label: string | null;
  ophaal_iso: string | null;
  subtotaal_cent: number;
  totaal_cent: number;
  mollie_id: string | null;
  betaald_op: string | null;
  token: string | null;
};

export type ItemRow = {
  product_id: string;
  naam: string;
  stukprijs_cent: number;
  aantal: number;
  regel_cent: number;
};

export class BestelFout extends Error {}

function nieuwOrderId(): string {
  const row = db.prepare('SELECT COUNT(*) AS n FROM orders').get() as { n: number };
  return `${factuur.nummerPrefix}-${String(row.n + 1).padStart(4, '0')}`;
}

/** Of de besteltermijn voor dit klanttype verlopen is (donaties blijven mogelijk). */
export function termijnVerlopen(klanttype: Klanttype, nu = new Date()): boolean {
  return nu.getTime() > new Date(momenten[klanttype].deadlineIso).getTime();
}

/**
 * Maakt een bestelling. Prijzen komen server-side uit de config. Het
 * ophaalmoment volgt uit het klanttype; bij een bestelling met alleen een
 * donatie (geen krans/stol) is er geen ophaalmoment (punt 1). Na de deadline
 * zijn producten geweigerd, donaties niet (punt 7).
 */
export function maakBestelling(input: OrderInput, nu = new Date()): { id: string; totaalCent: number; token: string } {
  const regels = producten
    .map((p) => {
      const aantal = Math.max(0, Math.floor(Number(input.aantallen[p.id]) || 0));
      if (aantal <= 0) return null;
      return { product_id: p.id, naam: p.naam, stukprijs_cent: p.prijsCent, aantal, regel_cent: p.prijsCent * aantal };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const aantalProducten = regels.filter((r) => r.product_id === kransId || r.product_id === stolId).reduce((s, r) => s + r.aantal, 0);
  const totaalCent = regels.reduce((s, r) => s + r.regel_cent, 0);
  if (totaalCent <= 0) throw new BestelFout('Kies minimaal één product of donatie.');

  if (aantalProducten > 0 && termijnVerlopen(input.klanttype, nu)) {
    throw new BestelFout('De besteltermijn is verlopen. Doneren kan nog wel.');
  }

  const isZakelijk = input.klanttype === 'zakelijk';
  if (isZakelijk && (!input.bedrijfsnaam?.trim() || !input.straat?.trim() || !input.postcode?.trim() || !input.plaats?.trim())) {
    throw new BestelFout('Vul de bedrijfsnaam en het volledige factuuradres in.');
  }

  // Ophaalmoment alleen bij fysieke producten.
  const moment = aantalProducten > 0 ? momenten[input.klanttype] : null;
  const id = nieuwOrderId();
  const token = randomBytes(16).toString('hex');

  const insertOrder = db.prepare(`
    INSERT INTO orders (id, created_at, status, klanttype, naam, email, telefoon, bedrijfsnaam, kvk, straat, postcode, plaats, opmerking,
      ophaal_type, ophaal_label, ophaal_iso, subtotaal_cent, totaal_cent, token)
    VALUES (@id, @created_at, 'pending', @klanttype, @naam, @email, @telefoon, @bedrijfsnaam, @kvk, @straat, @postcode, @plaats, @opmerking,
      @ophaal_type, @ophaal_label, @ophaal_iso, @subtotaal_cent, @totaal_cent, @token)
  `);
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, naam, stukprijs_cent, aantal, regel_cent)
    VALUES (@order_id, @product_id, @naam, @stukprijs_cent, @aantal, @regel_cent)
  `);

  db.transaction(() => {
    insertOrder.run({
      id,
      created_at: new Date().toISOString(),
      klanttype: input.klanttype,
      naam: input.naam,
      email: input.email,
      telefoon: input.telefoon || null,
      bedrijfsnaam: isZakelijk ? input.bedrijfsnaam || null : null,
      kvk: isZakelijk ? (input.kvk || '').replace(/\s/g, '') || null : null,
      straat: isZakelijk ? input.straat || null : null,
      postcode: isZakelijk ? input.postcode || null : null,
      plaats: isZakelijk ? input.plaats || null : null,
      opmerking: input.opmerking || null,
      ophaal_type: moment ? moment.type : null,
      ophaal_label: moment ? moment.ophalenTxt : null,
      ophaal_iso: moment ? moment.deadlineIso : null,
      subtotaal_cent: totaalCent,
      totaal_cent: totaalCent,
      token,
    });
    for (const r of regels) insertItem.run({ order_id: id, ...r });
  })();

  return { id, totaalCent, token };
}

export function getOrder(id: string): OrderRow | undefined {
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as OrderRow | undefined;
}
/** Bestelling alleen teruggeven als de sleutel uit de link klopt (bedank- en factuurlink). */
export function getOrderMetToken(id: string, token: string | null | undefined): OrderRow | undefined {
  const order = getOrder(id);
  if (!order?.token || !token) return undefined;
  const a = Buffer.from(order.token);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b) ? order : undefined;
}

export function getItems(orderId: string): ItemRow[] {
  return db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId) as ItemRow[];
}
export function setMollieId(orderId: string, mollieId: string): void {
  db.prepare('UPDATE orders SET mollie_id = ? WHERE id = ?').run(mollieId, orderId);
}
export function markeerStatus(orderId: string, status: string): void {
  const betaald = status === 'paid' ? new Date().toISOString() : null;
  if (betaald) db.prepare('UPDATE orders SET status = ?, betaald_op = ? WHERE id = ?').run(status, betaald, orderId);
  else db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, orderId);
}

export function betaaldeBestellingen(): (OrderRow & { items: ItemRow[] })[] {
  const orders = db
    .prepare("SELECT * FROM orders WHERE status = 'paid' ORDER BY ophaal_iso ASC, created_at ASC")
    .all() as OrderRow[];
  return orders.map((o) => ({ ...o, items: getItems(o.id) }));
}

export type UitgifteGroep = {
  type: string | null; // null = alleen-donatie
  label: string;
  iso: string;
  producten: Map<string, number>;
  bestellingen: number;
  omzetCent: number;
};

/** Totalen per ophaalgroep (bedrijven / particulieren / alleen donatie). */
export function uitgifteOverzicht(): UitgifteGroep[] {
  const orders = betaaldeBestellingen();
  const groepen = new Map<string, UitgifteGroep>();
  for (const o of orders) {
    const key = o.ophaal_type || 'donatie';
    if (!groepen.has(key)) {
      const m = o.ophaal_type ? momenten[o.ophaal_type as Klanttype] : null;
      groepen.set(key, {
        type: o.ophaal_type,
        label: m ? `${m.label} — afhalen ${m.ophalenTxt}` : 'Alleen donatie (geen ophaling)',
        iso: o.ophaal_iso || '9999',
        producten: new Map(),
        bestellingen: 0,
        omzetCent: 0,
      });
    }
    const g = groepen.get(key)!;
    g.bestellingen += 1;
    g.omzetCent += o.totaal_cent;
    // Alleen fysieke producten in de klaarzetlijst (donaties niet).
    for (const it of o.items) {
      if (it.product_id === donatieId) continue;
      g.producten.set(it.naam, (g.producten.get(it.naam) || 0) + it.aantal);
    }
  }
  return [...groepen.values()].sort((a, b) => a.iso.localeCompare(b.iso));
}
