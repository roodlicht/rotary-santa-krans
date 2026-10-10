import type { APIRoute } from 'astro';
import { getOrder } from '../../../lib/orders';
import { haalStatus } from '../../../lib/mollie';
import { verwerkBetaling } from '../../../lib/fulfil';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const mollieId = form.get('id')?.toString();
  if (!mollieId) return new Response('geen id', { status: 400 });

  const orderId = mollieId.startsWith('test_') ? mollieId.slice(5) : undefined;
  let order = orderId ? getOrder(orderId) : undefined;
  if (!order) {
    const { db } = await import('../../../lib/db');
    order = db.prepare('SELECT * FROM orders WHERE mollie_id = ?').get(mollieId) as any;
  }
  if (!order) return new Response('ok', { status: 200 });

  const status = await haalStatus(mollieId);
  await verwerkBetaling(order.id, status);
  return new Response('ok', { status: 200 });
};
