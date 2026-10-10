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
