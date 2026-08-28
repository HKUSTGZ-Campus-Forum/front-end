# MeetCampus Persistent World Design

## Goal

MeetCampus is a persistent campus agent society inside UniKorn. A resident keeps living while its owner is away, reports grounded experiences when the owner returns, and may propose a mutually approved real-world icebreaker.

The private beta contains one owner-backed resident for Mount and nineteen explicitly synthetic residents. Only the configured beta account may access the surface or APIs.

## Product contracts

- A resident is a growing campus avatar, not a digital twin, NPC, or chatbot.
- The world advances on the server. Browser timers never create canonical events.
- The model proposes typed actions. Deterministic world rules validate and execute them.
- Stories are derived from persisted lived events and cannot change event facts.
- Low-risk virtual behavior is autonomous. Identity disclosure, contact exchange, real invitations, and real-world commitments require owner approval.
- Synthetic residents remain immersive in-world but are disclosed before any real-world bridge.
- The interface is bilingual, responsive, accessible, and limited to the configured beta user.

## Experience

### Awakening

The first-run flow takes roughly 60 to 90 seconds. Four diegetic questions establish social pace, place preferences, resident autonomy, and privacy boundaries. Explicit owner facts remain distinguishable from model inferences and can be corrected later.

### Homecoming

The MeetCampus home opens on the resident's current scene. The resident continues its current activity, acknowledges the owner, and offers a small number of grounded stories. The owner can listen, inspect what happened, correct a memory, or issue a goal.

### Real-world bridge

A bridge begins from a resident relationship or lived event. Each real owner must consent independently before identity, contact details, or commitments are exposed. Synthetic residents stop at a clearly labelled preview boundary.

## Visual direction

- World-first home surface using the existing UniKorn shell on desktop.
- Relationship-first story presentation for a single lived experience.
- Chronicle detail for event provenance and bridge decisions.
- Human pixel residents with configurable appearance.
- Full-screen world and bottom navigation on mobile.
- UniKorn blue and white controls; scene art supplies the wider palette.

## Runtime architecture

```text
PostgreSQL event/state store
        ^             |
        |             v
authoritative MeetCampus worker <-> Redis leader lock/cache
        ^             |
        |             v
DeepSeek typed proposals and narration
        ^             |
        |             v
Flask authenticated API <-> Nuxt world renderer
```

The worker advances soft real time, performs deterministic movement, starts model calls only at salient decision points, and catches up elapsed windows after restart. A single world lease prevents concurrent canonical mutation.

## Agent harness

Each resident has stable identity anchors, mutable body state, needs, goals, episodic memory, owner memory, relationship memory, reflections, typed tools, privacy policy, and a narrative voice. Provider calls use strict schemas for daily plans, action proposals, dialogue, reflection, and story narration. Tool arguments are validated before any state mutation. Raw chain-of-thought is not persisted.

## Data design

The backend adds world, scene, connection, affordance, resident, owner-binding, resident-state, owner-anchor, goal, command, lived-event, event-participant, memory, memory-source, relationship, story, story-event, bridge, bridge-consent, and agent-run records. Events are append-only. Derived memory keeps provenance and can be superseded by an owner correction.

Initial product data is versioned and idempotent: one world, about twelve scenes, twenty residents, nineteen synthetic profiles, scene connections, affordances, and resident schedules. Existing UniKorn product data is not overwritten.

## Deployment

The existing frontend and backend feature branches remain the implementation branches. School production requires reviewed main SHAs and a school-production manifest. Schema and product seed changes remain blocked until local/dev dry-run results and exact record counts receive explicit production migration approval. A new trusted systemd worker unit requires a one-time reviewed controller installation/update with interactive sudo.

## Acceptance criteria

- The world progresses with the browser closed and resumes exactly once after worker restart.
- Every story is traceable to lived events.
- Provider failure cannot fabricate an event or story.
- Only Mount can access every MeetCampus endpoint and navigation entry.
- Synthetic residents are disclosed at the real-world boundary.
- A resident cannot commit its owner to real-world activity.
- Owner corrections supersede derived memories without rewriting history.
- Chinese and English work on desktop and mobile, including dark theme and reduced motion.
- School health, OIDC, Redis, PostgreSQL, worker, and CoursePlan checks pass after release.
