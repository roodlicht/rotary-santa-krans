/**
 * Eenvoudige rate limiting in het geheugen (per Node-proces). Genoeg voor deze
 * schaal; na een herstart begint de telling opnieuw.
 */
const pogingen = new Map<string, number[]>();

function opruimen(nu: number) {
  if (pogingen.size < 5000) return;
  for (const [k, t] of pogingen) if (nu - t[t.length - 1] > 60 * 60 * 1000) pogingen.delete(k);
}

/** Aantal geregistreerde pogingen voor deze sleutel binnen het venster. */
export function aantalRecent(sleutel: string, vensterMs: number, nu = Date.now()): number {
  const recent = (pogingen.get(sleutel) || []).filter((t) => nu - t < vensterMs);
  if (recent.length) pogingen.set(sleutel, recent);
  else pogingen.delete(sleutel);
  return recent.length;
}

export function registreer(sleutel: string, nu = Date.now()): void {
  opruimen(nu);
  pogingen.set(sleutel, [...(pogingen.get(sleutel) || []), nu]);
}

/** Registreert een poging en meldt of de limiet nu is overschreden. */
export function teVaak(sleutel: string, max: number, vensterMs: number): boolean {
  registreer(sleutel);
  return aantalRecent(sleutel, vensterMs) > max;
}

/**
 * IP-adres van de bezoeker. Achter Cloudflare staat dat in CF-Connecting-IP.
 * Let op: wie de server rechtstreeks benadert, kan die header vervalsen; daarom
 * heeft de beheer-login ook een limiet over alle IP's samen.
 */
export function bezoekerIp(ctx: { request: Request; clientAddress?: string }): string {
  const h = ctx.request.headers;
  let adres: string | undefined;
  try { adres = ctx.clientAddress; } catch { /* adapter zonder clientAddress */ }
  return (
    h.get('cf-connecting-ip') ||
    h.get('x-real-ip') ||
    h.get('x-forwarded-for')?.split(',')[0].trim() ||
    adres ||
    'onbekend'
  );
}

export const teVeelResponse = () =>
  new Response('Te veel verzoeken. Probeer het over een paar minuten opnieuw.', {
    status: 429,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '600' },
  });
