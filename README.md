# Retail location fulfillment constraint

A Shopify Function (Fulfillment Constraints API, version 2026-07, JavaScript).
It controls which location fulfills an order.

## Rules

| Cart | Allowed fulfillment locations |
|---|---|
| Comes from POS (`cart.retailLocation` is set), for example "send cart" / pay by link | Only the POS location where the cart was created |
| Comes from the online store (`cart.retailLocation` is empty) | All locations that are **not** marked as a retail store |

A retail store is a location with the metafield `custom.location_type` = `retail`.

The function never blocks checkout on its own:

- If no location is marked `retail`, all locations are allowed. The function adds no constraint.
- If every location is marked `retail`, no location is left. The function adds no constraint (fail open).

## Files

```
extensions/retail-location-fulfillment/
  shopify.extension.toml                                   Function configuration (target, API version)
  src/cart_fulfillment_constraints_generate_run.graphql    Input query (data the function receives)
  src/cart_fulfillment_constraints_generate_run.js         Function logic
  tests/fixtures/*.json                                    Test cases (input and expected output)
  schema.graphql                                           Function API schema (used by the tests)
setup/
  1-create-location-type-definition.graphql                Creates the custom.location_type metafield definition
  2-mark-retail-location.graphql                           Marks a location as a retail store
  3-activate-function.graphql                              Activates the function on the shop
```

## Installation

1. Copy `extensions/retail-location-fulfillment` into the `extensions/` folder of your Shopify app.
2. In the app root, install the packages: `npm install`.
3. Build and test the function:
   ```
   cd extensions/retail-location-fulfillment
   shopify app function build
   npx vitest run
   ```
4. Add the scope `write_fulfillment_constraint_rules` to `shopify.app.toml`.
5. Deploy the app: `shopify app deploy`. Install or update the app on the shop.
6. Run the mutations in `setup/` in order (1, 2, 3). For example, with `shopify app execute` or the GraphiQL app.

## Limits

- **The function controls the location, not the delivery method.** Fulfillment constraints cannot
  hide shipping or force pickup. To allow only pickup for POS carts, add a Delivery Customization
  function. Draft order checkout (pay by link) supports it.
- **Pickup search.** Checkout searches for pickup locations near the buyer's address. If the retail
  store is in another country, the buyer must search near the store.
- **Stock.** If the items are not available at the allowed locations, checkout shows no delivery
  options for them.
- **All locations count.** The function reads every location of the shop, including fulfillment
  service locations. Mark a location `retail` if online orders must not use it.
- **Testing.** Test each case on a development store before you use it on a live shop: one online
  order and one POS "send cart" order.
