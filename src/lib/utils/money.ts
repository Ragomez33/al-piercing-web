/**
 * Money helpers — integer cents end-to-end (constitution Principle IV).
 * All values are handled as integer cents; formatting is the only place
 * where they become a decimal string.
 */
const usdFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** "$12.50" — dollars with 2 decimals. */
export function formatCents(cents: number): string {
  return usdFormatter.format(cents / 100);
}

/** Deposit is exactly 50% of the quoted total, rounded to the nearest cent. */
export function calcDepositCents(totalCents: number): number {
  return Math.round(totalCents / 2);
}
