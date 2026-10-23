import { defineMiddleware } from 'astro:middleware';
import { sessieGeldig, COOKIE_NAAM } from './lib/auth';

const VEILIGE_METHODEN = new Set(['GET', 'HEAD', 'OPTIONS']);

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

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  if (csrfGeweigerd(context.request, pathname)) {
    return new Response('Verzoek geweigerd (ongeldige herkomst).', { status: 403 });
  }
  if (pathname.startsWith('/beheer') && pathname !== '/beheer/login') {
    if (!sessieGeldig(context.cookies.get(COOKIE_NAAM)?.value)) {
      return context.redirect('/beheer/login');
    }
  }
  return next();
});
