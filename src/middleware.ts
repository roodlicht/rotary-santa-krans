import { defineMiddleware } from 'astro:middleware';
import { sessieGeldig, COOKIE_NAAM } from './lib/auth';

const VEILIGE_METHODEN = new Set(['GET', 'HEAD', 'OPTIONS']);
// Formulieren zijn klein; grotere verzoeken weigeren voordat ze worden ingelezen.
const MAX_BODY = 64 * 1024;

/** Proxy-bewuste CSRF-check: Origin-host moet matchen met de draai-host. */
function csrfGeweigerd(request: Request, pathname: string): boolean {
  if (VEILIGE_METHODEN.has(request.method)) return false;
  // Mollie stuurt de webhook server-naar-server, zonder Origin. Veilig: de route
  // leest alleen een betaal-id en vraagt de echte status zelf op bij Mollie.
  if (pathname === '/api/webhook/mollie') return false;
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  try { return new URL(origin).host !== host; } catch { return true; }
}

/** Status als de lengte ontbreekt of de body te groot is, anders null. */
function bodyGeweigerd(request: Request): number | null {
  if (VEILIGE_METHODEN.has(request.method)) return null;
  const lengte = request.headers.get('content-length');
  // Zonder lengte maar met een (chunked) body: de grootte is vooraf niet te controleren.
  if (lengte === null) return request.headers.has('transfer-encoding') ? 411 : null;
  return Number(lengte) > MAX_BODY ? 413 : null;
}

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cloud.umami.is",
  "connect-src 'self' https://cloud.umami.is https://gateway.umami.is",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "frame-ancestors 'none'",
  // Na het bestelformulier volgt een redirect naar Mollie, en van daar naar
  // iDEAL/Wero/de bank. De browser toetst elke stap van die keten, dus elke
  // https-bestemming toestaan (anders blijft "Doorsturen naar iDEAL" hangen).
  "form-action 'self' https:",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

const HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  ...(import.meta.env.PROD ? { 'Strict-Transport-Security': 'max-age=15552000' } : {}),
};

/** Pagina's met persoonsgegevens niet laten bewaren door browser of proxy. */
const geenCache = (pathname: string) =>
  pathname.startsWith('/beheer') || pathname.startsWith('/api/beheer') || pathname.startsWith('/bedankt') || pathname.startsWith('/api/factuur');

function zetHeaders(response: Response, pathname: string): Response {
  try {
    for (const [k, v] of Object.entries(HEADERS)) response.headers.set(k, v);
    if ((response.headers.get('content-type') || '').includes('text/html')) response.headers.set('Content-Security-Policy', CSP);
    if (geenCache(pathname)) response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    // Onveranderbare headers (bv. Response.redirect): kopie maken.
    const kopie = new Response(response.body, response);
    return zetHeaders(kopie, pathname);
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  if (csrfGeweigerd(context.request, pathname)) {
    return new Response('Verzoek geweigerd (ongeldige herkomst).', { status: 403 });
  }
  const bodyStatus = bodyGeweigerd(context.request);
  if (bodyStatus) return new Response('Verzoek geweigerd (te groot of zonder lengte).', { status: bodyStatus });
  if (pathname.startsWith('/beheer') && pathname !== '/beheer/login') {
    if (!sessieGeldig(context.cookies.get(COOKIE_NAAM)?.value)) {
      return zetHeaders(context.redirect('/beheer/login'), pathname);
    }
  }
  return zetHeaders(await next(), pathname);
});
