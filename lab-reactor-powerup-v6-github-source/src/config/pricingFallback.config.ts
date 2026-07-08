/*
 * Fallback pricing configuration.
 *
 * In the absence of a real pricing engine this file can define
 * baseline prices per programme or per session. The pricing engine
 * reads this file when the Google Sheet integration is disabled.
 */

export const pricingFallback: Record<string, number> = {
  // Example per‑programme baseline price per child (tax excluded)
  NASA: 30,
  Brixo: 25,
  Robotique: 28,
  'Atomes crochus': 24,
  'Sciences dans tous les sens': 26,
  'Laboratoire en folie': 27,
  'Ingénieur Junior': 29,
  Autre: 20,
};