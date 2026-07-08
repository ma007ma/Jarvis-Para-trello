/*
 * Google Sheet pricing adapter.
 *
 * This module is responsible for retrieving pricing information from a
 * Google Sheet. In the MVP phase this adapter can be a stub that
 * returns default values or uses a simple formula. Once a stable
 * integration with the sheet is available (phase 2), replace the
 * implementation here. The adapter should never depend on React or
 * browser APIs directly; instead it operates on plain data and can be
 * tested independently.
 */

import { LabState } from '../trello/customFieldsClient';

export async function fetchPricingFromSheet(state: LabState) {
  // TODO: integrate with Google Sheets API or fetch CSV from a hosted
  // sheet. The sheet might contain pricing tiers based on program,
  // group size, duration, etc. For the MVP we simply return an empty
  // object so that the UI remains functional.
  return {};
}