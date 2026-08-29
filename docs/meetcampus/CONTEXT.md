# MeetCampus

MeetCampus is a persistent campus agent society in which residents continue living while their owners are away and turn grounded shared experiences into consent-based real-world icebreakers.

## People and identity

**Owner（主人）**:
An authenticated UniKorn user paired with one resident and solely authorized to make real-world commitments for that resident.
_Avoid_: Player, operator

**Resident（小人、校园分身）**:
A growing campus avatar anchored in its owner's preferences and boundaries while developing its own memories, relationships, and opinions.
_Avoid_: Digital twin, NPC, chatbot

**Synthetic resident（合成内测居民）**:
A resident used to populate the private-beta world that is explicitly not associated with a real person.
_Avoid_: Fake user, simulated real user

## World and experience

**World（世界）**:
The authoritative, continuously advancing campus reality shared by all residents.
_Avoid_: Map screen, scripted flow

**Scene（场景）**:
A bounded place within the campus world that defines what residents can perceive and do there.
_Avoid_: Page, level

**Journey（行程）**:
A continuous, time-bounded traversal along a world-validated route from one scene to another.
_Avoid_: Teleport, scene switch

**Activity definition（活动定义）**:
A world-owned description of an available activity, including its place, duration, participant requirements, effects, and outcome rules.
_Avoid_: Prompt suggestion, generated activity

**Activity session（活动会话）**:
One concrete attempt at an activity with explicit participants, timing, resource use, and a world-resolved outcome.
_Avoid_: Encounter template, automatic pairing

**Invitation（邀请）**:
A resident's proposal to another resident to join an activity, which the recipient independently accepts or declines.
_Avoid_: Match, forced encounter

**Lived event（亲历事件）**:
A world-validated occurrence involving a resident, a scene, another resident, or an activity.
_Avoid_: Generated plot, scripted story

**Memory（记忆）**:
A resident's provenance-linked recollection or interpretation derived from lived events or explicit owner statements.
_Avoid_: Chat history, prompt context

**Observation（观察）**:
A time-stamped, local view of facts a resident is permitted to know at a decision boundary.
_Avoid_: Global state dump, omniscient context

**Intent（意图）**:
A typed action proposal selected by a resident from currently valid candidates and submitted to the world for validation.
_Avoid_: Completed action, free-form plot

**Decision trace（决策轨迹）**:
The auditable chain from observation and recalled memory through candidate intents, validation, execution, and resulting facts.
_Avoid_: Chain of thought, debug log

**Resident relationship（小人关系）**:
A persistent, evolving relationship between residents grounded in their repeated lived events.
_Avoid_: Owner friendship, match score

## Owner experience

**Homecoming（归来）**:
The moment an owner returns and reconnects with the resident at the resident's current scene.
_Avoid_: Login landing, dashboard load

**Perspective（视角）**:
The owner-facing read and command context of one resident. Private-beta perspective switching changes this context without changing ownership or the resident runtime.
_Avoid_: Impersonation, cloned agent

**Story（见闻）**:
A resident-voiced account compiled from one or more lived events without changing their underlying facts.
_Avoid_: Feed item, generated content

**Real-world bridge（现实桥接）**:
The mutually approved transition from a resident relationship or lived event to contact or an activity between real owners.
_Avoid_: Auto-match, agent commitment
