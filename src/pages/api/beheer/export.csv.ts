import type { APIRoute } from 'astro';
import { betaaldeBestellingen } from '../../../lib/orders';
import { sessieGeldig, COOKIE_NAAM } from '../../../lib/auth';
import { producten } from '../../../config/site';

export const prerender = false;

function cel(v: string | number): string {
  const s = String(v ?? '');
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV-export van bestellers (punt 16). Met ?groep=zakelijk|particulier|donatie
    exporteer je één afhaalgroep (punt 6). ';' + BOM voor Excel-NL. */
export const GET: APIRoute = async ({ cookies, url }) => {
  if (!sessieGeldig(cookies.get(COOKIE_NAAM)?.value)) return new Response('Niet toegestaan', { status: 403 });

  const groep = url.searchParams.get('groep');
  let orders = betaaldeBestellingen();
  let bestandsnaam = 'bestellingen-santakrans.csv';
  if (groep) {
    orders = orders.filter((o) => (o.ophaal_type || 'donatie') === groep);
    bestandsnaam = `bestellingen-${groep}.csv`;
  }

  const kop = [
    'Bestelnummer', 'Datum', 'Type', 'Bedrijfsnaam', 'Straat', 'Postcode', 'Plaats', 'Naam', 'E-mail', 'Telefoon', 'Afhalen',
    ...producten.map((p) => p.naam),
    'Totaal (EUR)', 'Opmerking',
  ];
  const regels = orders.map((o) => {
    const perProduct = producten.map((p) => o.items.filter((i) => i.product_id === p.id).reduce((a, i) => a + i.aantal, 0));
    return [
      o.id, new Date(o.created_at).toLocaleDateString('nl-NL'), o.klanttype, o.bedrijfsnaam || '',
      o.straat || '', o.postcode || '', o.plaats || '',
      o.naam, o.email, o.telefoon || '', o.ophaal_label || 'alleen donatie',
      ...perProduct,
      (o.totaal_cent / 100).toFixed(2).replace('.', ','), o.opmerking || '',
    ];
  });
  const csv = [kop, ...regels].map((r) => r.map(cel).join(';')).join('\r\n');
  return new Response('﻿' + csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${bestandsnaam}"` },
  });
};
