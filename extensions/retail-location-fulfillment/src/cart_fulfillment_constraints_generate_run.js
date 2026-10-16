// @ts-check

/**
 * Fulfillment constraint: retail location routing
 *
 * Rules:
 * 1. The cart has a retail location (the cart comes from POS):
 *    all lines must be fulfilled from that retail location.
 * 2. The cart has no retail location (the cart comes from the online store):
 *    all lines must be fulfilled from a location that is NOT a retail store.
 *    A retail store is a location with the metafield
 *    `custom.location_type` = "retail".
 *
 * The function never blocks checkout on its own:
 * - No location is marked "retail": every location is allowed, so the
 *   function returns no constraint.
 * - Every location is marked "retail": no location is left, so the function
 *   returns no constraint (fail open) instead of blocking checkout.
 *
 * Note: A fulfillment constraint controls WHICH LOCATION fulfills the items.
 * It does not control the delivery method (shipping or pickup). If the items
 * are not available at the allowed locations, checkout shows no delivery
 * options for them.
 */

/**
 * @typedef {import("../generated/api").CartFulfillmentConstraintsGenerateRunInput} CartFulfillmentConstraintsGenerateRunInput
 * @typedef {import("../generated/api").CartFulfillmentConstraintsGenerateRunResult} CartFulfillmentConstraintsGenerateRunResult
 */

/** Value of the `custom.location_type` location metafield that marks a retail store. */
const RETAIL_LOCATION_TYPE = "retail";

/**
 * Result that adds no constraint. Shopify then uses its default routing.
 * @type {CartFulfillmentConstraintsGenerateRunResult}
 */
const NO_CHANGES = { operations: [] };

/**
 * Entry point. Shopify calls this function for each checkout.
 *
 * @param {CartFulfillmentConstraintsGenerateRunInput} input
 * @returns {CartFulfillmentConstraintsGenerateRunResult}
 */
export function cartFulfillmentConstraintsGenerateRun(input) {
  // Collect the IDs of all lines that need delivery.
  const deliverableLineIds = input.cart.deliverableLines.map((line) => line.id);
  if (deliverableLineIds.length === 0) {
    return NO_CHANGES;
  }

  // Rule 1: POS cart. Fulfill everything from the retail location.
  const retailLocationId = input.cart.retailLocation?.id;
  if (retailLocationId) {
    return mustFulfillFrom(deliverableLineIds, [retailLocationId]);
  }

  // Rule 2: online cart. Allow only locations that are not retail stores.
  const nonRetailLocationIds = input.locations
    .filter((location) => location.locationType?.value !== RETAIL_LOCATION_TYPE)
    .map((location) => location.id);

  // No retail store is marked: every location is allowed, so no constraint is needed.
  // Every location is a retail store: fail open rather than block checkout.
  if (
    nonRetailLocationIds.length === input.locations.length ||
    nonRetailLocationIds.length === 0
  ) {
    return NO_CHANGES;
  }

  return mustFulfillFrom(deliverableLineIds, nonRetailLocationIds);
}

/**
 * Builds the result that forces the lines to be fulfilled from one of the
 * given locations.
 *
 * @param {string[]} deliverableLineIds The cart lines to constrain.
 * @param {string[]} locationIds The locations that are allowed to fulfill them.
 * @returns {CartFulfillmentConstraintsGenerateRunResult}
 */
function mustFulfillFrom(deliverableLineIds, locationIds) {
  return {
    operations: [
      { deliverableLinesMustFulfillFromAdd: { deliverableLineIds, locationIds } },
    ],
  };
}
