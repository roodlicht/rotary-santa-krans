import type { APIRoute } from 'astro';
import { wachtwoordKlopt, maakSessie, COOKIE_NAAM, SESSIE_MS } from '../../../lib/auth';
import { aantalRecent, registreer, bezoekerIp } from '../../../lib/limiet';

export const prerender = false;

const VENSTER = 15 * 60 * 1000;
const MAX_PER_IP = 5;
// Ook een limiet over alle IP's samen: het IP is te vervalsen als iemand de server
// buiten Cloudflare om benadert. Nadeel: een aanvaller kan het inloggen 15 minuten blokkeren.
const MAX_TOTAAL = 30;

export const POST: APIRoute = async (ctx) => {
  const { request, redirect, cookies } = ctx;
  const ip = `login:${bezoekerIp(ctx)}`;
  if (aantalRecent(ip, VENSTER) >= MAX_PER_IP || aantalRecent('login:alle', VENSTER) >= MAX_TOTAAL) {
    return redirect('/beheer/login?fout=geblokkeerd', 303);
  }
  const form = await request.formData();
  if (!wachtwoordKlopt(form.get('wachtwoord')?.toString() || '')) {
    registreer(ip);
    registreer('login:alle');
    await new Promise((r) => setTimeout(r, 1000)); // raden vertragen
    return redirect('/beheer/login?fout=1', 303);
  }
  cookies.set(COOKIE_NAAM, maakSessie(), { httpOnly: true, sameSite: 'lax', path: '/', secure: import.meta.env.PROD, maxAge: SESSIE_MS / 1000 });
  return redirect('/beheer', 303);
};
