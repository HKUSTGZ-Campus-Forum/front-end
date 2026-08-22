# UniKorn Course Planning

This context describes the language UniKorn uses for building, saving, and sharing semester timetables.

## Language

**Planner workspace**:
The single mutable course cart and constraint set a user is currently editing for one semester.
_Avoid_: Active plan, saved cart

**Schedule plan**:
A named snapshot of one concrete, conflict-free timetable selected from a planner workspace.
_Avoid_: Result index, cart, template

**Shared plan**:
A schedule plan whose owner has made it link-visible or publicly discoverable.
_Avoid_: Collaborative plan, community cart

**Plan copy**:
A private schedule plan created from another user's shared plan, with no continuing connection to the source.
_Avoid_: Fork, collaboration

**Offering**:
A canonical course available in one scheduler semester.
_Avoid_: Course tag, course alone

**Section**:
A selectable class component within an offering. One saved course can contain several sections across its required layers.
_Avoid_: Lecture, offering

**Plan availability**:
Whether every saved section still exists unchanged, has updated scheduling data, or is no longer available.
_Avoid_: Plan validity
