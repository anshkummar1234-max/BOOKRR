# BOOKRR

[![Deploy to Hatchable](https://hatchable.com/deploy-button.svg)](https://hatchable.com/deploy?repo=https://github.com/anshkummar1234-max/BOOKRR)

**Find your turf. Book your slot. Bring your squad.**

BOOKRR is a turf discovery and booking-request platform. The repository includes a responsive, motion-led public website, database-backed venue and booking APIs, match invitations and RSVPs, player booking history, venue-owner workflows, and admin operations/analytics.

## Product capabilities

- Browse database-backed active sports venues. Discovery now defaults to Gorakhpur and filters by city/area, sport, listed rate, and verification status.
- Check BOOKRR-side slot availability and submit booking requests.
- View personal booking requests after signing in.
- Create shareable match plans and collect player RSVPs.
- Apply for venue-owner access and manage venue information through the owner workflow.
- Review bookings, moderate venues, and inspect growth analytics through admin-only routes.

## Important launch limitations

- A booking submission is a **request**, not a confirmed reservation. The venue must confirm the slot and price.
- Availability reflects BOOKRR booking records only. Walk-in bookings and external venue calendars are not synchronized.
- The discovery grid is populated from active database venue records; it no longer presents the homepage's old hard-coded example cards as live listings. Only records marked verified receive a verified badge.
- Online UPI/card payments are not enabled in the current codebase.
- Venue hours and listing details may be provisional until independently verified.

Do not advertise BOOKRR as offering guaranteed real-time availability or online payments until those systems are implemented and tested.

## Platform

The project is configured for Hatchable-managed authentication and database services. API routes import the `hatchable` package; database access, auth, and deployment therefore depend on the Hatchable runtime and its configured services.

The `hatchable.toml` file enables email authentication and declares table access policies. Database schema changes are maintained in `migrations/`.

## Deploy

1. Open [Hatchable Deploy](https://hatchable.com/deploy).
2. Import this repository or upload the project folder.
3. Configure the project services and secrets in the Hatchable environment.
4. Apply database migrations in order and verify the seed data.
5. Run the production smoke-test checklist before sharing the live URL.

A successful import is not, by itself, proof that authentication, migrations, booking concurrency, or admin permissions are working. Validate those flows in a staging environment first.

## Engineering notes

- Production-readiness findings and release gates: [docs/PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md).
- Keep database writes on the server. Never trust client-side payment or booking-confirmation state.
- Preserve the distinction between requested, confirmed, rejected, cancelled, and completed bookings.
- Keep admin routes protected by server-side authorization.
- Avoid committing credentials, provider secrets, or production data.

## Brand

- Name: BOOKRR
- Tagline: Your turf. Your game.
- Visual direction: deep charcoal/green surfaces with a high-contrast lime accent.
