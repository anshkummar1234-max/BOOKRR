# BOOKRR production-readiness audit

Audit date: 2026-11-11
Branch: work/bookrr-production-readiness
Base: main

## Product snapshot

BOOKRR is a turf-discovery and booking-request platform with match-plan invitations, RSVP collection, player booking history, venue-owner flows, and admin operations/analytics. The project uses Hatchable-managed authentication, database access, API routes, migrations, and deployment configuration.

## Confirmed from repository source

- Email authentication is enabled in `hatchable.toml`.
- Public venue listing is served by `api/venues.js`; it returns active venues and includes rate, hours, and verification status.
- Slot suggestions are served by `api/availability.js`. They exclude BOOKRR requests in requested/confirmed states and explicitly warn that walk-ins and external calendars are not synchronized.
- Booking requests are created by `api/bookings.js`. The handler validates fields, checks venue hours, rate-limits per user, locks the venue row in a transaction, and rejects overlapping requests/confirmed bookings.
- Admin booking and venue routes declare `access = 'admin'`.
- Match plans and RSVPs are supported by `api/matches.js` and related routes; match-plan creation has an IP-hash rate limit.
- The public homepage contains hard-coded example venue cards and explicitly labels some venue details, ratings, prices, and availability as unverified.
- The homepage and booking copy state that online UPI payment is not enabled.
- Front-end scripts use heavily obfuscated JavaScript, which makes maintenance, debugging, security review, and regression testing harder.

## Release blockers / work required

1. **Venue data consistency:** replace or clearly separate hard-coded discovery cards from the database-backed venue directory. Every displayed venue, rating, sport, price, and verification badge must be sourced and labeled correctly.
2. **Availability truthfulness:** present slot results as provisional BOOKRR-side availability until venue calendars/walk-ins are synchronized. Keep the confirmation warning visible at the point of booking.
3. **Venue onboarding and verification:** verify owner identity/contact and venue details before marking a listing verified. Do not imply verification from an admin toggle alone without an operational checklist.
4. **Booking operations:** test concurrent requests, cancellation/rejection/rebooking, admin status transitions, time-zone boundaries, and venue-hour edge cases against a real database.
5. **Payments:** either integrate a compliant payment provider with server-side verification, idempotency, refunds, and webhook handling, or keep payment collection disabled and state this clearly. Never trust a client-side payment-success state.
6. **Privacy and abuse controls:** review retention of phone numbers, admin access, public RSVP display, invite-token lifecycle, rate limits, and privacy/consent copy.
7. **Maintainability:** deobfuscate and modularize first-party front-end scripts, add linting/formatting, and preserve a readable source-of-truth.
8. **Automated verification:** add API tests for authorization, validation, overlapping slots, match invite expiry, RSVP uniqueness, and admin-only operations; add deployment smoke tests.
9. **Operational readiness:** document environment/service requirements, migration order, backups, error monitoring, and rollback procedure.

## Validation limits

This is a source-level audit only. The connected repository does not expose a running deployment/database test environment in this review, so no claim is made that production deployment, live authentication, real booking contention, or payment flows have been executed successfully.

## Changes made on the development branch\n\n- Added `public/gorakhpur-discovery.js`, which replaces the old hard-coded homepage discovery cards with active venue records from `/api/venues`, safely renders venue data as text, supports sport filters, and defaults the search to Gorakhpur. It displays an explicit empty state instead of inventing venues when no matching records exist.\n- Updated `api/venues.js` to accept a city/area query (default: Gorakhpur), return active matching records, prioritize verified listings, and report directory errors without leaking database details.\n- Updated `public/index.html` to load the new discovery module after the existing site script.\n\n## Validation status\n\nThe changes are committed to the isolated development branch. They have not been executed against a live Hatchable deployment or production database. In particular, confirm that venue `area` or `map_query` values include `Gorakhpur` or a searchable local area; otherwise the directory will correctly show an empty state. Confirm browser loading, sport filters, map directions, and the Hatchable route before merging. No claim is made that a live Gorakhpur venue inventory already exists.\n\n## Immediate next milestones

- M1: establish reproducible local/staging setup and automated checks.
- M2: make venue discovery entirely data-driven and label unverified data accurately.
- M3: harden booking lifecycle and admin operations with integration tests.
- M4: complete venue-owner verification and operations workflow.
- M5: decide and implement payment provider, or explicitly launch without online payments.
- M6: production smoke test, security review, backup/rollback checklist.
