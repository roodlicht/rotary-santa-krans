import { createMollieClient } from '@mollie/api-client';
import { molliewaarde } from './money';
import { betaling } from '../config/site';

const apiKey = process.env.MOLLIE_API_KEY || '';
export const testmodus = apiKey.trim() === '';
// MOLLIE_API_ENDPOINT alleen voor tests tegen een nagebootste Mollie-server.
const client = testmodus
  ? null
  : createMollieClient({ apiKey, ...(process.env.MOLLIE_API_ENDPOINT ? { apiEndpoint: process.env.MOLLIE_API_ENDPOINT } : {}) });

type StartArgs = { orderId: string; token: string; totaalCent: number; baseUrl: string };

/** Link naar de bedankpagina; de sleutel voorkomt dat anderen bestellingen kunnen inzien. */
export function bedanktUrl(baseUrl: string, orderId: string, token: string): string {
  return `${baseUrl}/bedankt/${orderId}?t=${token}`;
}

/**
 * Start een betaling. In TESTMODUS (geen MOLLIE_API_KEY) wordt de betaling
 * gesimuleerd via een ingebouwde pagina (je kiest 'betaald'/'mislukt').
 */
export async function startBetaling({ orderId, token, totaalCent, baseUrl }: StartArgs): Promise<{ checkoutUrl: string; mollieId: string }> {
  if (testmodus || !client) {
    return { checkoutUrl: `${bedanktUrl(baseUrl, orderId, token)}&sim=1`, mollieId: `test_${orderId}` };
  }
  const methoden = betaling.methoden.filter(Boolean);
  const payment = await client.payments.create({
    amount: { currency: 'EUR', value: molliewaarde(totaalCent) },
    description: `Rotary Santa Krans — bestelling ${orderId}`,
    redirectUrl: bedanktUrl(baseUrl, orderId, token),
    webhookUrl: `${baseUrl}/api/webhook/mollie`,
    metadata: { orderId },
    ...(methoden.length ? { method: methoden as any } : {}),
  });
  return { checkoutUrl: payment.getCheckoutUrl() || bedanktUrl(baseUrl, orderId, token), mollieId: payment.id };
}

export async function haalStatus(mollieId: string): Promise<string> {
  if (testmodus || !client) return 'paid';
  const payment = await client.payments.get(mollieId);
  return payment.status;
}
