import type { APIRoute } from 'astro';
import { stuurContact } from '../../lib/mail';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const naam = (form.get('naam')?.toString() || '').trim();
  const email = (form.get('email')?.toString() || '').trim();
  const bericht = (form.get('bericht')?.toString() || '').trim();
  const ordernummer = (form.get('ordernummer')?.toString() || '').trim();
  if (!naam || !/\S+@\S+\.\S+/.test(email) || !bericht) {
    return new Response('Vul je naam, e-mail en bericht in.', { status: 400 });
  }
  try {
    await stuurContact(naam, email, bericht, ordernummer || undefined);
  } catch (e) {
    console.error('[contact] mailen mislukt:', e);
    return redirect('/contact?fout=1', 303);
  }
  return redirect('/contact?verzonden=1', 303);
};
