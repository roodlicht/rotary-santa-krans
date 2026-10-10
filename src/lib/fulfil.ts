import { getOrder, getItems, markeerStatus } from './orders';
import { stuurFactuur } from './mail';

/**
 * Verwerkt een betaalde bestelling: status 'paid' + factuur mailen. Idempotent
 * (betaald_op gezet = al verwerkt). Aangeroepen door webhook én testmodus-sim.
 */
export async function verwerkBetaling(orderId: string, status: string): Promise<void> {
  const order = getOrder(orderId);
  if (!order) return;
  if (status === 'paid') {
    if (order.status === 'paid' && order.betaald_op) return;
    markeerStatus(orderId, 'paid');
    const verse = getOrder(orderId)!;
    try { await stuurFactuur(verse, getItems(orderId)); }
    catch (e) { console.error(`[fulfil] factuur mailen mislukt voor ${orderId}:`, e); }
  } else if (['failed', 'canceled', 'expired'].includes(status)) {
    markeerStatus(orderId, status);
  }
}
