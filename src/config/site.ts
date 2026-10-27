/*
 * ────────────────────────────────────────────────────────────────────────
 *  CENTRALE CONFIGURATIE — pas dit bestand per jaar aan.
 *  Clubinfo, producten, prijzen, besteldeadlines, ophaalmomenten en de
 *  factuurafzender. Bedragen in EUROCENTEN (1700 = € 17,00).
 * ────────────────────────────────────────────────────────────────────────
 */

export const club = {
  naam: 'Rotary Santa Krans',
  jaar: 2026,
  contactEmail: 'support@rotarykerstkrans.nl',
  adres: 'Rietveen 1, 4823 HK Breda',
  maps: 'https://www.google.com/maps/search/?api=1&query=Rietveen+1+4823+HK+Breda',
  organisatie: 'Een actie van de vier Rotary clubs van Breda',
  clubs: [
    'Rotary Club Breda-Zuid',
    'Rotary Club Breda-Mark en Aa',
    'Rotary Club Breda',
    'Rotary Club Breda-Mastbos',
  ],
};

export const seo = {
  titel: 'Rotary Santa Krans 2026 · Kerstkransen en kerststollen voor het goede doel',
  beschrijving:
    'Bestel een roomboter kerstkrans of ambachtelijke kerststol van de Rotary clubs van Breda. De opbrengst gaat naar Jeugdfonds Sport & Cultuur Breda.',
  ogImage: '/img/krans-close.jpg',
};

/* Het goede doel (punt 2). Feiten van jeugdfondssportencultuur.nl/fondsen/breda/ */
export const goedeDoel = {
  naam: 'Jeugdfonds Sport & Cultuur Breda',
  url: 'https://jeugdfondssportencultuur.nl/fondsen/breda/',
  kop: 'Zodat elk kind in Breda kan sporten en meedoen',
  alineas: [
    'Net als vorig jaar gaat de opbrengst van de Rotary Santa Krans naar het Jeugdfonds Sport & Cultuur Breda.',
    'Voor veel gezinnen is de contributie van een sportclub of het lesgeld voor muziek, dans of theater niet op te brengen. Het Jeugdfonds betaalt die kosten, en soms ook spullen zoals sportkleding of dansschoenen. Het geld gaat rechtstreeks naar de club, dus het komt altijd terecht waar het voor bedoeld is.',
  ],
  // Uitgelicht cijfer (letterlijk van de Breda-pagina van het Jeugdfonds).
  cijfer: '1 op de 9',
  cijferTekst: 'kinderen in Breda groeit op in armoede',
};

/* Wie organiseert het (blok onderaan de homepage). */
export const organisatie = {
  titel: 'De vier Rotary clubs van Breda',
  intro: 'Samen organiseren we de Rotary Santa Krans. De opbrengst gaat naar het Jeugdfonds Sport & Cultuur Breda.',
};

/* Producten. 'donatie' telt als product met vaste stukprijs, zonder afhalen. */
export type Product = {
  id: 'krans' | 'stol' | 'donatie';
  naam: string;
  omschrijving: string;
  prijsCent: number;
  afbeelding?: string; // bestand in /public/img
  contain?: boolean; // afbeelding 'contain' tonen
};

export const producten: Product[] = [
  { id: 'krans', naam: 'Roomboter kerstkrans', omschrijving: 'Met echte amandelspijs, rijk versierd.', prijsCent: 1500, afbeelding: 'krans-los.jpg', contain: true },
  { id: 'stol', naam: 'Ambachtelijke kerststol', omschrijving: 'Met echte amandelspijs en royaal gevuld.', prijsCent: 1500, afbeelding: 'stol-gesneden.jpg' },
  { id: 'donatie', naam: 'Donatie', omschrijving: 'Een gift aan het Jeugdfonds, zonder product.', prijsCent: 1250 },
];

export const kransId = 'krans';
export const stolId = 'stol';
export const donatieId = 'donatie';

/*
 * Klanttypes bepalen het ophaalmoment én de besteldeadline (punt 1 & 7).
 * Bedrijven en particulieren halen op verschillende dagen af.
 * deadlineIso: laatste besteldatum (daarna alleen nog doneren).
 */
export type Klanttype = 'particulier' | 'zakelijk';

export type Moment = {
  type: Klanttype;
  label: string;
  deadlineIso: string;   // laatste besteltijdstip (daarna alleen nog doneren)
  deadlineTxt: string;   // zo getoond op de site
  ophalenTxt: string;    // volledige afhaaltekst, ook op factuur en in mails
  ophaalKort: string;    // korte dag + datum, voor footer en contactpagina
  ophaalTijd: string;    // tijdvak
  ophaalDag: string;     // dagnummer, voor de datumbadge
  ophaalMaand: string;
};

export const momenten: Record<Klanttype, Moment> = {
  // Bestelmoment 2
  particulier: {
    type: 'particulier',
    label: 'Particulieren',
    deadlineIso: '2026-12-17T10:00:00+01:00',
    deadlineTxt: 'donderdag 17 december, 10:00 uur',
    ophalenTxt: 'dinsdag 22 december, 18:00 – 21:00 uur',
    ophaalKort: 'di 22 december',
    ophaalTijd: '18:00 – 21:00 uur',
    ophaalDag: '22',
    ophaalMaand: 'dec',
  },
  // Bestelmoment 1
  zakelijk: {
    type: 'zakelijk',
    label: 'Bedrijven',
    deadlineIso: '2026-12-03T10:00:00+01:00',
    deadlineTxt: 'donderdag 3 december, 10:00 uur',
    ophalenTxt: 'dinsdag 8 december, 18:00 – 21:00 uur',
    ophaalKort: 'di 8 december',
    ophaalTijd: '18:00 – 21:00 uur',
    ophaalDag: '8',
    ophaalMaand: 'dec',
  },
};

/* Betaling (punt 3/10). Alleen iDEAL en Wero, geen creditcard. */
export const betaling = {
  // Leeg = Mollie toont alle methodes die in je Mollie-dashboard aan staan
  // (nu iDEAL en Wero). Alleen invullen om de keuze extra te beperken.
  methoden: [] as string[],
  uitleg: 'Je betaalt veilig met iDEAL of Wero via Mollie.',
};

/*
 * Onderwerpen van het contactformulier. Het label komt tussen [haken] vooraan in
 * het onderwerp van de mail aan support@, zodat je per onderwerp kunt filteren
 * of later automatisch kunt beantwoorden. Het id kan in een link: /contact?onderwerp=factuur
 */
export const contactOnderwerpen = [
  { id: 'afhalen', label: 'Afhalen' },
  { id: 'factuur', label: 'Factuur' },
  { id: 'wijzigen', label: 'Bestelling wijzigen of annuleren' },
  { id: 'betaling', label: 'Betaling' },
  { id: 'zakelijk', label: 'Zakelijke bestelling' },
  { id: 'overig', label: 'Overig' },
];

/* Meldingen aan de organisatie. */
export const meldingen = {
  // Bij elke betaalde bestelling een mail naar het contactadres (support@).
  nieuweBestelling: true,
};

/*
 * Factuurafzender (punt 12). Geen btw (punt 11).
 */
export const factuur = {
  afzenderNaam: 'Stichting Community Service Rotary Club Breda-Zuid',
  afzenderRegels: ['Nieuw Wolfslaarlaan 31', '4854 EA Bavel'],
  kvk: '20096019',
  iban: 'NL94 ABNA 0520 0545 71',
  email: 'support@rotarykerstkrans.nl',
  btwNotitie:
    'Deze actie wordt verzorgd zonder winstoogmerk. Over deze bedragen wordt geen btw in rekening gebracht.',
  nummerPrefix: 'SK-2026',
};
