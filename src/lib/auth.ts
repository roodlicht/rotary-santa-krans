import { createHmac, timingSafeEqual } from 'node:crypto';

const SECRET = process.env.SESSION_SECRET || 'onveilig-dev-secret';
export const COOKIE_NAAM = 'beheer_sessie';

function teken(waarde: string): string {
  return createHmac('sha256', SECRET).update(waarde).digest('hex');
}
export function maakSessie(): string {
  const waarde = 'beheerder';
  return `${waarde}.${teken(waarde)}`;
}
export function sessieGeldig(token: string | undefined): boolean {
  if (!token) return false;
  const [waarde, sig] = token.split('.');
  if (!waarde || !sig) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(teken(waarde));
  return a.length === b.length && timingSafeEqual(a, b);
}
export function wachtwoordKlopt(ingevoerd: string): boolean {
  const juist = process.env.ADMIN_PASSWORD || 'santakrans2026';
  const a = Buffer.from(ingevoerd);
  const b = Buffer.from(juist);
  return a.length === b.length && timingSafeEqual(a, b);
}
