import type { APIRoute } from 'astro';
import { wachtwoordKlopt, maakSessie, COOKIE_NAAM } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  const form = await request.formData();
  if (!wachtwoordKlopt(form.get('wachtwoord')?.toString() || '')) return redirect('/beheer/login?fout=1', 303);
  cookies.set(COOKIE_NAAM, maakSessie(), { httpOnly: true, sameSite: 'lax', path: '/', secure: import.meta.env.PROD, maxAge: 60 * 60 * 8 });
  return redirect('/beheer', 303);
};
export const GET: APIRoute = async ({ redirect, cookies }) => {
  cookies.delete(COOKIE_NAAM, { path: '/' });
  return redirect('/beheer/login', 303);
};
