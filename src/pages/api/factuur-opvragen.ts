import type { APIRoute } from 'astro';
import { getOrder, getItems } from '../../lib/orders';
import { stuurFactuur } from '../../lib/mail';

export const prerender = false;

/** Verstuurt de factuur opnieuw bij juiste bestelnummer + e-mail (punt 13).
    Altijd dezelfde bevestiging, ook zonder match (geen aftasten mogelijk). */
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const ordernummer = (form.get('ordernummer')?.toString() || '').trim();
  const email = (form.get('email')?.toString() || '').trim().toLowerCase();
  const order = getOrder(ordernummer);
  if (order && order.status === 'paid' && order.email.toLowerCase() === email) {
    try { await stuurFactuur(order, getItems(order.id)); }
    catch (e) { console.error('[factuur-opvragen] mislukt:', e); }
  }
  return redirect('/factuur-opvragen?verstuurd=1', 303);
};
