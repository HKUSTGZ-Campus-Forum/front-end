# MeetCampus Simulation Runtime Design

## Goal

Replace the private-beta action/story shortcut with a continuously running campus simulation. Twenty residents share the same perception, decision, movement, activity, memory, relationship, and homecoming contracts. Mount may switch perspective among all residents for private-beta debugging without changing ownership.

## Invariants

- The backend allowlist contains only `wtao565@connect.hkust-gz.edu.cn`; every MeetCampus API verifies it.
- Synthetic provenance is audit-only and is never present in Resident Runtime observations or candidate scoring.
- A model selects a typed candidate intent. It cannot invent scenes, activities, participants, outcomes, or completed facts.
- Travel consumes world time and is rendered by interpolation along a persisted route.
- Shared activity requires an invitation and an independent recipient response.
- A lived event is produced only after the world completes a journey or activity session.
- Homecoming compiles unreported lived events and never creates world facts.
- Decision traces persist observations, retrieved memory summaries, candidates, selected intent, validation, and execution, but not hidden chain of thought.

## Runtime flow

1. Process due journeys, invitations, and activity sessions.
2. Build local observations for due idle residents.
3. Retrieve recent and salient memories and generate valid candidate intents.
4. Let DeepSeek select a candidate when budget and salience policy permit; use the same deterministic utility fallback for every resident.
5. Validate and execute the intent in the world kernel.
6. Persist facts, memory, relationships, needs, and trace execution.
7. Compile a perspective-specific homecoming when the private-beta owner returns.

## UI

- The campus map interpolates active journeys against server time.
- A private-beta perspective control changes the resident context used by the map, relationships, commands, stories, and traces.
- The resident sheet shows current journey, activity, invitation, and needs without exposing model chain of thought.
- Desktop and mobile use the existing UniKorn blue campus-tool vocabulary, bilingual copy, keyboard focus, and reduced-motion handling.

## Production migration

The migration adds one route geometry field, seven runtime tables, and twenty-one versioned activity definitions. Existing MeetCampus events and owner data remain untouched. Release activation uses the existing verified backup, Alembic oneshot, post-migration table-count gate, paired main SHAs, and school health checks.
