# Changelog

All notable changes to `@repull/sdk` and `@repull/types` are recorded here.
This project follows [Semantic Versioning](https://semver.org/).

## v0.1.2 — 2026-05-02

Add custom-schema CRUD endpoints + `X-Schema` header on all read endpoints. Fix `Reservation` type drift (breaking).

### Added
- `repull.schemas.list / get / create / update / delete` — full CRUD over `/v1/schema/custom` for workspace-scoped field-mapping schemas (`createCustomSchema`, `listCustomSchemas`, `getCustomSchema`, `updateCustomSchema`, `deleteCustomSchema`).
- `xSchema` per-call option on every read method (`reservations.list/get`, `conversations.list/get/messages`, `guests.list/get`, `reviews.list/get`) — forwards as the `X-Schema: <name>` request header.
- New types re-exported from `@repull/types`: `CustomSchema`, `CustomSchemaSummary`, `CustomSchemaCreate`, `CustomSchemaCreateResponse`, `CustomSchemaUpdate`, `CustomSchemaListResponse`, `CustomSchemaDeleteResponse`, `CustomSchemaMappings`.

### Changed (breaking — types only)
- `Reservation` shape now matches what `api.repull.dev` actually returns. Removed phantom fields: `propertyId`, `guestFirstName`, `guestLastName`, `guestEmail`, `guestPhone`, `guestCount`, `provider`. Real fields are `listingId`, `guestId`, `guestDetails`, `guestName`. Consumers depending on the old fields will see compile errors — that is intentional; the previous shape did not match runtime responses.

## v0.1.1

Adds `repull.conversations`, `repull.guests`, `repull.reviews` and migrates `repull.reservations.list()` to cursor pagination (legacy `?offset=` walk still works during the deprecation window).

## v0.1.0

Initial public release.
