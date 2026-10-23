import type { APIRoute } from 'astro';
import { getOrderMetToken, getItems } from '../../../lib/orders';
import { maakFactuurPdf } from '../../../lib/invoice';

export const prerender = false;

/** Alleen met de sleutel uit de bedanklink; opnieuw opvragen kan via /factuur-opvragen (per e-mail). */
export const GET: APIRoute = async ({ params, url }) => {
  const order = params.id ? getOrderMetToken(params.id, url.searchParams.get('t')) : undefined;
  if (!order || order.status !== 'paid') return new Response('Factuur niet beschikbaar.', { status: 404 });
  const pdf = await maakFactuurPdf(order, getItems(order.id));
  return new Response(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="factuur-${order.id}.pdf"` } });
};
