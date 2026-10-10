import type { APIRoute } from 'astro';
import { getOrder, getItems } from '../../../lib/orders';
import { maakFactuurPdf } from '../../../lib/invoice';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const order = params.id ? getOrder(params.id) : undefined;
  if (!order || order.status !== 'paid') return new Response('Factuur niet beschikbaar.', { status: 404 });
  const pdf = await maakFactuurPdf(order, getItems(order.id));
  return new Response(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="factuur-${order.id}.pdf"` } });
};
