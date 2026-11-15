import type { APIRoute } from 'astro';
import { stuurContact } from '../../lib/mail';
import { contactOnderwerpen } from '../../config/site';
import { geldigEmail, teLang, isBot } from '../../lib/invoer';
import { teVaak, bezoekerIp, teVeelResponse } from '../../lib/limiet';

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const { request, redirect } = ctx;
  if (teVaak(`contact:${bezoekerIp(ctx)}`, 5, 10 * 60 * 1000)) return teVeelResponse();
  const form = await request.formData();
  // Spambot: doen alsof het gelukt is, zodat hij niet gaat zoeken naar een omweg.
  if (isBot(form)) return redirect('/contact?verzonden=1', 303);
  const naam = (form.get('naam')?.toString() || '').trim();
  const email = (form.get('email')?.toString() || '').trim();
  const bericht = (form.get('bericht')?.toString() || '').trim();
  const ordernummer = (form.get('ordernummer')?.toString() || '').trim();
  // Alleen onderwerpen uit de config; iets anders wordt 'Overig'.
  const gekozen = contactOnderwerpen.find((o) => o.id === form.get('onderwerp')?.toString());
  const onderwerp = (gekozen || contactOnderwerpen.find((o) => o.id === 'overig') || contactOnderwerpen[0]).label;
  if (!naam || !geldigEmail(email) || !bericht) {
    return new Response('Vul je naam, e-mail en bericht in.', { status: 400 });
  }
  if (teLang({ naam, email, bericht, ordernummer })) {
    return new Response('Een van de velden is te lang.', { status: 400 });
  }
  try {
    await stuurContact(onderwerp, naam, email, bericht, ordernummer || undefined);
  } catch (e) {
    console.error('[contact] mailen mislukt:', e);
    return redirect('/contact?fout=1', 303);
  }
  return redirect('/contact?verzonden=1', 303);
};
