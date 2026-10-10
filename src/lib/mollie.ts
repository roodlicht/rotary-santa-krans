import { createMollieClient } from '@mollie/api-client';
import { molliewaarde } from './money';
import { betaling } from '../config/site';

const apiKey = process.env.MOLLIE_API_KEY || '';
export const testmodus = apiKey.trim() === '';
const client = testmodus ? null : createMollieClient({ apiKey });

type StartArgs = { orderId: string; totaalCent: number; baseUrl: string };

/**
 * Start een betaling. In TESTMODUS (geen MOLLIE_API_KEY) wordt de betaling
 * gesimuleerd via een ingebouwde pagina (je kiest 'betaald'/'mislukt').
 */
export async function startBetaling({ orderId, totaalCent, baseUrl }: StartArgs): Promise<{ checkoutUrl: string; mollieId: string }> {
  if (testmodus || !client) {
    return { checkoutUrl: `${baseUrl}/bedankt/${orderId}?sim=1`, mollieId: `test_${orderId}` };
  }
  const methoden = betaling.methoden.filter(Boolean);
  const payment = await client.payments.create({
    amount: { currency: 'EUR', value: molliewaarde(totaalCent) },
    description: `Rotary Santa Krans — bestelling ${orderId}`,
    redirectUrl: `${baseUrl}/bedankt/${orderId}`,
    webhookUrl: `${baseUrl}/api/webhook/mollie`,
    metadata: { orderId },
    ...(methoden.length ? { method: methoden as any } : {}),
  });
  return { checkoutUrl: payment.getCheckoutUrl() || `${baseUrl}/bedankt/${orderId}`, mollieId: payment.id };
}

export async function haalStatus(mollieId: string): Promise<string> {
  if (testmodus || !client) return 'paid';
  const payment = await client.payments.get(mollieId);
  return payment.status;
}
