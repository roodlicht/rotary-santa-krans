/** Centen → "17,00". */
export function euro(cent: number): string {
  return (cent / 100).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
/** Centen → "€ 17,00". */
export function euroPrefix(cent: number): string {
  return `€ ${euro(cent)}`;
}
/** Mollie verwacht "17.00". */
export function molliewaarde(cent: number): string {
  return (cent / 100).toFixed(2);
}
/** Korte weergave voor badges en lopende tekst: 1500 → "€15", 1250 → "€12,50". */
export function euroKort(cent: number): string {
  return cent % 100 === 0 ? `€${cent / 100}` : `€${euro(cent)}`;
}
