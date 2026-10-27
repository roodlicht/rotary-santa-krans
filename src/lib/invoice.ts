import PDFDocument from 'pdfkit';
import { factuur, club, goedeDoel, momenten, type Klanttype } from '../config/site';
import { euroPrefix } from './money';
import type { OrderRow, ItemRow } from './orders';

const ROOD = '#C8202B';
const GOUD = '#E0A526';
const GROEN = '#2F5A3E';
const INKT = '#33201A';
const GRIJS = '#6E5A4E';

/** Tekent het Rotary-wiel (tandwiel) rond (cx, cy) met straal R in goud. */
function tekenWiel(doc: PDFKit.PDFDocument, cx: number, cy: number, R: number) {
  const tandStraal = R * 0.85;
  const seg = (2 * Math.PI * tandStraal) / 48;
  doc.save();
  doc.lineWidth(R * 0.3).dash(seg, { space: seg }).circle(cx, cy, tandStraal).stroke(GOUD);
  doc.undash();
  doc.lineWidth(R * 0.16).circle(cx, cy, R * 0.68).stroke(GOUD);
  doc.lineWidth(R * 0.12);
  for (let i = 0; i < 6; i++) {
    const a = (i * 60 * Math.PI) / 180;
    doc.moveTo(cx + Math.cos(a) * R * 0.26, cy + Math.sin(a) * R * 0.26)
      .lineTo(cx + Math.cos(a) * R * 0.64, cy + Math.sin(a) * R * 0.64).stroke(GOUD);
  }
  doc.lineWidth(R * 0.12).circle(cx, cy, R * 0.26).stroke(GOUD);
  doc.rect(cx - R * 0.06, cy - R * 0.34, R * 0.12, R * 0.22).fill(GOUD);
  doc.restore();
}

/** Professionele factuur-PDF met logo (punt 8, 11, 12, 13). Geen btw (punt 11). */
export function maakFactuurPdf(order: OrderRow, items: ItemRow[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const L = 50, R = 545;

    // Kop: logo + naam links, afzender rechts
    tekenWiel(doc, L + 22, 76, 22);
    doc.fillColor(ROOD).font('Helvetica-Bold').fontSize(19).text('Rotary Santa Krans', L + 54, 58);
    doc.fillColor(GRIJS).font('Helvetica').fontSize(9).text(club.organisatie, L + 54, 82);

    doc.font('Helvetica').fontSize(9).fillColor(GRIJS);
    doc.text([factuur.afzenderNaam, ...factuur.afzenderRegels, `KvK: ${factuur.kvk}`, `IBAN: ${factuur.iban}`, factuur.email].join('\n'), L, 56, { width: R - L, align: 'right' });

    // Lijn één regel onder het afzenderblok (dat groeit mee met het aantal regels);
    // alles daaronder schuift evenveel op.
    const lijnY = Math.max(116, doc.y + 11);
    const dy = lijnY - 116;
    doc.moveTo(L, lijnY).lineTo(R, lijnY).lineWidth(1).strokeColor('#e3ded0').stroke();

    // Titel + meta
    doc.fillColor(GROEN).font('Helvetica-Bold').fontSize(17).text('Factuur', L, 138 + dy);
    doc.fillColor(INKT).font('Helvetica').fontSize(10);
    const datum = order.betaald_op || order.created_at;
    doc.text(`Factuurnummer: ${order.id}`, L, 165 + dy);
    doc.text(`Datum: ${new Date(datum).toLocaleDateString('nl-NL')}`, L, 180 + dy);

    // Aan
    doc.font('Helvetica-Bold').fontSize(10).fillColor(INKT).text('Aan', 330, 165 + dy);
    doc.font('Helvetica').fontSize(10).fillColor(GRIJS);
    const aan: string[] = [];
    if (order.klanttype === 'zakelijk' && order.bedrijfsnaam) {
      aan.push(order.bedrijfsnaam);
      aan.push(`t.a.v. ${order.naam}`);
      if (order.straat) aan.push(order.straat);
      if (order.postcode || order.plaats) aan.push(`${order.postcode || ''} ${order.plaats || ''}`.trim());
    } else {
      aan.push(order.naam);
    }
    aan.push(order.email);
    if (order.telefoon) aan.push(order.telefoon);
    doc.text(aan.join('\n'), 330, 180 + dy, { width: R - 330 });
    const aanEinde = doc.y;

    let y = 232 + dy;
    if (order.ophaal_label) {
      doc.font('Helvetica').fontSize(10).fillColor(INKT).text(`Afhalen: ${order.ophaal_label}`, L, y);
      doc.text(momenten[order.ophaal_type as Klanttype]?.adres ?? '', L, y + 14);
      y += 38;
    }
    // De tabel begint altijd onder het Aan-blok, ook als dat lang is (zakelijk, geen afhaalregel).
    y = Math.max(y, aanEinde + 16);

    // Regels
    const cOms = L, cAantal = 330, cStuk = 400, cTot = 480;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GROEN);
    doc.text('Omschrijving', cOms, y); doc.text('Aantal', cAantal, y); doc.text('Stukprijs', cStuk, y); doc.text('Totaal', cTot, y);
    y += 14;
    doc.moveTo(L, y).lineTo(R, y).lineWidth(0.7).strokeColor('#ddd').stroke();
    y += 8;
    doc.font('Helvetica').fontSize(10).fillColor(INKT);
    for (const it of items) {
      doc.text(it.naam, cOms, y, { width: 260 });
      doc.text(String(it.aantal), cAantal, y);
      doc.text(euroPrefix(it.stukprijs_cent), cStuk, y);
      doc.text(euroPrefix(it.regel_cent), cTot, y);
      y += 20;
    }
    doc.moveTo(L, y).lineTo(R, y).lineWidth(0.7).strokeColor('#ddd').stroke();
    y += 10;
    doc.font('Helvetica-Bold').fontSize(12).fillColor(INKT);
    doc.text('Totaal', cStuk, y); doc.text(euroPrefix(order.totaal_cent), cTot, y);
    y += 36;

    doc.font('Helvetica').fontSize(9).fillColor(GRIJS).text(factuur.btwNotitie, L, y, { width: R - L });
    y += 26;
    doc.fillColor(GROEN).fontSize(10).text(`Hartelijk dank voor uw steun aan ${goedeDoel.naam}.`, L, y, { width: R - L });

    doc.end();
  });
}
