/** Server-side invoercontrole voor de formulieren. */

/** Maximale lengte per veld; langer wordt geweigerd. */
export const MAX = {
  naam: 100,
  email: 254,
  telefoon: 30,
  bedrijfsnaam: 120,
  straat: 120,
  postcode: 12,
  plaats: 80,
  opmerking: 1000,
  bericht: 5000,
  ordernummer: 30,
} as const;

// Precies één adres: geen spaties, komma's, puntkomma's of <> (anders gaat mail naar meerdere ontvangers).
const EMAIL = /^[^\s@,;<>()"\\]+@[^\s@,;<>()"\\]+\.[^\s@,;<>()"\\.]{2,}$/;
export const geldigEmail = (s: string) => s.length <= MAX.email && EMAIL.test(s);

/** Of een van de velden langer is dan toegestaan. */
export function teLang(velden: Partial<Record<keyof typeof MAX, string>>): boolean {
  return Object.entries(velden).some(([k, v]) => (v || '').length > MAX[k as keyof typeof MAX]);
}

/** Honeypot: een verborgen veld dat mensen leeg laten en spambots invullen. */
export const isBot = (form: FormData) => !!form.get('website')?.toString();
