import { defineMiddleware } from 'astro:middleware';
import { sessieGeldig, COOKIE_NAAM } from './lib/auth';

const VEILIGE_METHODEN = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Proxy-bewuste CSRF-check: Origin-host moet matchen met de draai-host. */
function csrfGeweigerd(request: Request): boolean {
  if (VEILIGE_METHODEN.has(request.method)) return false;
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  try { return new URL(origin).host !== host; } catch { return true; }
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (csrfGeweigerd(context.request)) {
    return new Response('Verzoek geweigerd (ongeldige herkomst).', { status: 403 });
  }
  const { pathname } = context.url;
  if (pathname.startsWith('/beheer') && pathname !== '/beheer/login') {
    if (!sessieGeldig(context.cookies.get(COOKIE_NAAM)?.value)) {
      return context.redirect('/beheer/login');
    }
  }
  return next();
});
