/**
 * Proxy-bewuste publieke base-URL (voor Mollie redirect/webhook + betaal-redirect).
 * Achter Plesk/Passenger staan x-forwarded-host/-proto; lokaal de Host-header.
 */
export function getBaseUrl(request: Request, url: URL): string {
  // Vaste URL als die is ingesteld (productie): voorspelbare https-redirect en -webhook.
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
  if (host) return `${proto}://${host}`;
  return (process.env.SITE_URL || url.origin).replace(/\/$/, '');
}
