import { createHmac, timingSafeEqual } from 'node:crypto';

// De repo is publiek, dus er mogen in productie geen bekende standaardwaarden
// gelden. Alleen lokaal (astro dev) vallen we terug op dev-waarden.
const PROD = import.meta.env.PROD;
const SECRET = process.env.SESSION_SECRET || (PROD ? '' : 'onveilig-dev-secret');
const WACHTWOORD = process.env.ADMIN_PASSWORD || (PROD ? '' : 'santakrans2026');

export const COOKIE_NAAM = 'beheer_sessie';

/** False als ADMIN_PASSWORD of SESSION_SECRET in productie ontbreekt: beheer blijft dan dicht. */
export function beheerGeconfigureerd(): boolean {
  return SECRET.length > 0 && WACHTWOORD.length > 0;
}

function teken(waarde: string): string {
  return createHmac('sha256', SECRET).update(waarde).digest('hex');
}
export function maakSessie(): string {
  const waarde = 'beheerder';
  return `${waarde}.${teken(waarde)}`;
}
export function sessieGeldig(token: string | undefined): boolean {
  if (!token || !beheerGeconfigureerd()) return false;
  const [waarde, sig] = token.split('.');
  if (!waarde || !sig) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(teken(waarde));
  return a.length === b.length && timingSafeEqual(a, b);
}
export function wachtwoordKlopt(ingevoerd: string): boolean {
  if (!beheerGeconfigureerd()) return false;
  const a = Buffer.from(ingevoerd);
  const b = Buffer.from(WACHTWOORD);
  return a.length === b.length && timingSafeEqual(a, b);
}
