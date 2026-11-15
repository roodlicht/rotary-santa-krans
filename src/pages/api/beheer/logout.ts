import type { APIRoute } from 'astro';
import { COOKIE_NAAM } from '../../../lib/auth';

export const prerender = false;

/** Uitloggen via POST (formulier), zodat een andere site je niet ongemerkt kan uitloggen. */
export const POST: APIRoute = async ({ redirect, cookies }) => {
  cookies.delete(COOKIE_NAAM, { path: '/' });
  return redirect('/beheer/login', 303);
};
