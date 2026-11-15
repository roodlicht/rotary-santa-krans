import type { APIRoute } from 'astro';
import { maakBestelling, setMollieId, markeerStatus, BestelFout } from '../../lib/orders';
import { club } from '../../config/site';
import { startBetaling } from '../../lib/mollie';
import { getBaseUrl } from '../../lib/url';
import { geldigEmail, teLang, isBot } from '../../lib/invoer';
import { teVaak, bezoekerIp, teVeelResponse } from '../../lib/limiet';
import type { Klanttype } from '../../config/site';

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const { request, redirect, url } = ctx;
  if (teVaak(`checkout:${bezoekerIp(ctx)}`, 10, 10 * 60 * 1000)) return teVeelResponse();
  const form = await request.formData();
  if (isBot(form)) return new Response('Er ging iets mis bij het aanmaken van de bestelling.', { status: 400 });
  const v = (k: string) => (form.get(k)?.toString() || '').trim();
  const n = (k: string) => parseInt(v(k) || '0', 10) || 0;

  const klanttype: Klanttype = v('klanttype') === 'zakelijk' ? 'zakelijk' : 'particulier';

  if (!v('naam') || !geldigEmail(v('email')) || v('telefoon').length < 8) {
    return new Response('Vul je naam, een geldig e-mailadres en telefoonnummer in.', { status: 400 });
  }
  const velden = ['naam', 'email', 'telefoon', 'bedrijfsnaam', 'straat', 'postcode', 'plaats', 'opmerking'] as const;
  if (teLang(Object.fromEntries(velden.map((k) => [k, v(k)])))) {
    return new Response('Een van de velden is te lang.', { status: 400 });
  }

  let order;
  try {
    order = maakBestelling({
      klanttype,
      naam: v('naam'),
      email: v('email'),
      telefoon: v('telefoon'),
      bedrijfsnaam: v('bedrijfsnaam'),
      straat: v('straat'),
      postcode: v('postcode'),
      plaats: v('plaats'),
      opmerking: v('opmerking'),
      aantallen: { krans: n('aantal_krans'), stol: n('aantal_stol'), donatie: n('aantal_donatie') },
    });
  } catch (e) {
    if (e instanceof BestelFout) return new Response(e.message, { status: 400 });
    return new Response('Er ging iets mis bij het aanmaken van de bestelling.', { status: 400 });
  }

  const baseUrl = getBaseUrl(request, url);
  try {
    const { checkoutUrl, mollieId } = await startBetaling({ orderId: order.id, token: order.token, totaalCent: order.totaalCent, baseUrl });
    setMollieId(order.id, mollieId);
    return redirect(checkoutUrl, 303);
  } catch (e) {
    // Bv. een verkeerde Mollie-sleutel of een storing bij Mollie: geen halve bestelling laten staan.
    console.error(`[checkout] betaling starten mislukt voor ${order.id}:`, e);
    markeerStatus(order.id, 'failed');
    return new Response(
      `Betalen is op dit moment niet mogelijk. Probeer het later opnieuw, of mail ${club.contactEmail}.`,
      { status: 502, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    );
  }
};
