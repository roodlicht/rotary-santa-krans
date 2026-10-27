import nodemailer from 'nodemailer';
import { club, factuur, goedeDoel, meldingen } from '../config/site';
import { euroPrefix } from './money';
import { maakFactuurPdf } from './invoice';
import type { OrderRow, ItemRow } from './orders';

// MAIL_VIA=sendmail: aflevering via het lokale sendmail-programma (Plesk). Zo
// versturen ook PHP-sites; de relay-regels van poort 25 gelden dan niet en Plesk
// ondertekent met DKIM. Anders SMTP als SMTP_HOST is ingesteld.
const viaSendmail = process.env.MAIL_VIA === 'sendmail';
const heeftSmtp = !viaSendmail && !!process.env.SMTP_HOST;
// Mailserver op dezelfde machine (Plesk): geen TLS, want het certificaat hoort bij
// mail.<domein> en niet bij localhost, en de mail verlaat de server hier nog niet.
const lokaal = ['localhost', '127.0.0.1', '::1'].includes(process.env.SMTP_HOST || '');
// nodemailer zoekt hostnamen via DNS op, en daar staat 'localhost' niet in.
const smtpHost = process.env.SMTP_HOST === 'localhost' ? '127.0.0.1' : process.env.SMTP_HOST;
const transporter = viaSendmail
  ? nodemailer.createTransport({ sendmail: true, newline: 'unix', path: process.env.SENDMAIL_PATH || '/usr/sbin/sendmail' })
  : heeftSmtp
  ? nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      ignoreTLS: lokaal,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  : null;
const FROM = process.env.SMTP_FROM || `${club.naam} <${factuur.email}>`;

/** Bevestiging + factuur-PDF naar de besteller (punt 11, 13). Bestelnummer prominent (punt 7). */
export async function stuurFactuur(order: OrderRow, items: ItemRow[]): Promise<void> {
  const pdf = await maakFactuurPdf(order, items);
  const tekst = [
    `Beste ${order.naam.split(' ')[0]},`,
    '',
    `Hartelijk dank voor je bestelling bij ${club.naam}. Je factuur zit als bijlage bij deze e-mail.`,
    '',
    `===============================`,
    `  JE BESTELNUMMER: ${order.id}`,
    `===============================`,
    `Bewaar dit nummer. Je hebt het samen met je e-mailadres nodig als je later`,
    `je factuur opnieuw wilt opvragen via de website.`,
    '',
    `Totaal betaald: ${euroPrefix(order.totaal_cent)}`,
    ...(order.ophaal_label
      ? [`Afhalen: ${order.ophaal_label}`, `Adres: ${club.adres}`, `Neem je bestelnummer mee.`]
      : ['Je hebt alleen een donatie gedaan — er hoeft niets te worden afgehaald.']),
    '',
    `De opbrengst gaat naar ${goedeDoel.naam}. Hartelijk dank voor je steun!`,
    '',
    `Met vriendelijke groet,`,
    club.organisatie,
  ].join('\n');

  const message = {
    from: FROM,
    to: order.email,
    subject: `Je bevestiging en factuur — ${order.id}`,
    text: tekst,
    attachments: [{ filename: `factuur-${order.id}.pdf`, content: pdf }],
  };
  if (!transporter) { console.log(`[mail] (dev, niet verstuurd) factuur ${order.id} → ${order.email}`); return; }
  await transporter.sendMail(message);
}

/** Melding aan de organisatie bij een betaalde bestelling (reply-to = besteller). */
export async function stuurBestelmelding(order: OrderRow, items: ItemRow[]): Promise<void> {
  if (!meldingen.nieuweBestelling) return;
  const regels = items.map((i) => `  ${i.aantal}× ${i.naam}  ${euroPrefix(i.regel_cent)}`);
  const tekst = [
    `Nieuwe betaalde bestelling: ${order.id}`,
    '',
    order.klanttype === 'zakelijk' ? `Bedrijf:   ${order.bedrijfsnaam}` : 'Particulier',
    ...(order.klanttype === 'zakelijk' ? [`Adres:     ${order.straat}, ${order.postcode} ${order.plaats}`] : []),
    `Naam:      ${order.naam}`,
    `E-mail:    ${order.email}`,
    `Telefoon:  ${order.telefoon || '—'}`,
    '',
    ...regels,
    `  Totaal   ${euroPrefix(order.totaal_cent)}`,
    '',
    `Afhalen:   ${order.ophaal_label || 'n.v.t. (alleen donatie)'}`,
    ...(order.opmerking ? ['', `Opmerking: ${order.opmerking}`] : []),
    '',
    'Alle bestellingen: /beheer',
  ].join('\n');
  const message = {
    from: FROM,
    to: club.contactEmail,
    replyTo: order.email,
    subject: `Nieuwe bestelling ${order.id} — ${order.bedrijfsnaam || order.naam} — ${euroPrefix(order.totaal_cent)}`,
    text: tekst,
  };
  if (!transporter) { console.log(`[mail] (dev, niet verstuurd) bestelmelding ${order.id}`); return; }
  await transporter.sendMail(message);
}

/** Contactformulier-bericht naar de organisatie (reply-to = afzender). */
export async function stuurContact(onderwerp: string, naam: string, email: string, bericht: string, ordernr?: string): Promise<void> {
  const tekst = [`Onderwerp: ${onderwerp}`, `Naam: ${naam}`, `E-mail: ${email}`, ordernr ? `Ordernummer: ${ordernr}` : '', '', bericht].join('\n');
  const message = { from: FROM, to: club.contactEmail, replyTo: email, subject: `[${onderwerp}] Contactformulier${ordernr ? ' · ' + ordernr : ''} — ${naam}`, text: tekst };
  if (!transporter) {
    // In productie mag een bericht niet stil verdwijnen: de bezoeker krijgt dan een foutmelding.
    if (import.meta.env.PROD) throw new Error('Geen mailserver ingesteld (SMTP_HOST ontbreekt)');
    console.log(`[mail] (dev, niet verstuurd) contact van ${email}`);
    return;
  }
  await transporter.sendMail(message);
}
