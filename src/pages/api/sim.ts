import type { APIRoute } from 'astro';
import { testmodus } from '../../lib/mollie';
import { verwerkBetaling } from '../../lib/fulfil';

export const prerender = false;

/** Alleen TESTMODUS: simuleer de uitkomst van een betaling. */
export const POST: APIRoute = async ({ request, redirect }) => {
  if (!testmodus) return new Response('Niet beschikbaar', { status: 404 });
  const form = await request.formData();
  const orderId = form.get('orderId')?.toString() || '';
  const resultaat = form.get('resultaat')?.toString() === 'paid' ? 'paid' : 'failed';
  await verwerkBetaling(orderId, resultaat);
  return redirect(`/bedankt/${orderId}`, 303);
};
