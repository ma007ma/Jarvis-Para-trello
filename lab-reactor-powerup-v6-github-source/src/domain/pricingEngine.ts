/*
 * Pricing engine for Lab Reactor.
 *
 * This module centralises all price calculations for the parascolaire
 * programmes. In phase 1 it may rely on a Google Sheet adapter to
 * compute prices; if that adapter is unavailable or throws an error
 * the engine falls back to default logic or leaves values empty. The
 * engine never performs network calls directly from React components.
 */

import { LabState } from '../trello/customFieldsClient';
import { fetchPricingFromSheet } from '../adapters/googleSheetPricingAdapter';

export interface PricingResult {
  pricePerChildBeforeTax?: number;
  pricePerChildTaxIncluded?: number;
  pricePerLab?: number;
  revenueTotal?: number;
  requiredGroups?: number;
  discountTotal?: number;
  extraTotal?: number;
  labCostEstimate?: number;
  profitEstimate?: number;
  // Additional fields as needed
}

/**
 * Compute pricing based on the current LabState. If the Google Sheet
 * adapter is configured, use it; otherwise return an empty result.
 * Catch and log all errors to avoid breaking the UI.
 */
export async function computePricing(state: LabState): Promise<PricingResult> {
  try {
    return await fetchPricingFromSheet(state);
  } catch (err) {
    console.warn('Pricing adapter failed; returning empty pricing', err);
    return {};
  }
}