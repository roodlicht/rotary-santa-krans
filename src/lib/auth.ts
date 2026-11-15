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
export const SESSIE_MS = 8 * 60 * 60 * 1000;

/** Sessie = 'beheerder.<verloopt-op>.<handtekening>': na 8 uur ongeldig, ook als het cookie blijft bestaan. */
export function maakSessie(nu = Date.now()): string {
  const waarde = `beheerder.${nu + SESSIE_MS}`;
  return `${waarde}.${teken(waarde)}`;
}
export function sessieGeldig(token: string | undefined, nu = Date.now()): boolean {
  if (!token || !beheerGeconfigureerd()) return false;
  const i = token.lastIndexOf('.');
  if (i <= 0) return false;
  const waarde = token.slice(0, i);
  const a = Buffer.from(token.slice(i + 1));
  const b = Buffer.from(teken(waarde));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const verlooptOp = Number(waarde.split('.')[1]);
  return Number.isFinite(verlooptOp) && nu < verlooptOp;
}
export function wachtwoordKlopt(ingevoerd: string): boolean {
  if (!beheerGeconfigureerd()) return false;
  const a = Buffer.from(ingevoerd);
  const b = Buffer.from(WACHTWOORD);
  return a.length === b.length && timingSafeEqual(a, b);
}
