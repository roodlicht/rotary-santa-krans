import type { APIRoute } from 'astro';
import { maakBestelling, setMollieId, BestelFout } from '../../lib/orders';
import { startBetaling } from '../../lib/mollie';
import { getBaseUrl } from '../../lib/url';
import type { Klanttype } from '../../config/site';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect, url }) => {
  const form = await request.formData();
  const v = (k: string) => (form.get(k)?.toString() || '').trim();
  const n = (k: string) => parseInt(v(k) || '0', 10) || 0;

  const klanttype: Klanttype = v('klanttype') === 'zakelijk' ? 'zakelijk' : 'particulier';

  if (!v('naam') || !/\S+@\S+\.\S+/.test(v('email')) || v('telefoon').length < 8) {
    return new Response('Vul je naam, een geldig e-mailadres en telefoonnummer in.', { status: 400 });
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
  const { checkoutUrl, mollieId } = await startBetaling({ orderId: order.id, totaalCent: order.totaalCent, baseUrl });
  setMollieId(order.id, mollieId);
  return redirect(checkoutUrl, 303);
};
