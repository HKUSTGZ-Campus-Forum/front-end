# MakerSpace design

Status: implemented locally; production activation requires the backend's exact migration and infrastructure plan.

The user requested a creator workshop at `/makerspace`: independent private repositories, bounded shared hosting, author-only previews, platform approval before discovery, and attribution of the existing TeamUp app to its creator. The standalone sidebar TeamUp entry becomes MakerSpace, while existing TeamUp URLs remain valid.

The interface follows the forum/course Keguang shell: title and primary action, discovery/owner views, search/category controls and white cards with theme variables. Metadata and instructions are bilingual; forms, cards and runtime frames stack on narrow screens. Management and review are distinct permission-scoped flows.

The main page is a trusted shell. User code runs only through the backend's browser-bound opaque sandbox, with no host credentials or localStorage. Private and public deployment records and storage remain separate. A new push or a successful build does not change the published pointer. Review binds a complete source SHA and artifact digest; authors cannot review themselves.

Acceptance: creation and key-generation flow, owner-only metadata and previews, readable errors/empty/loading states, real isolated build, independent review and public promotion, existing TeamUp discovery/attribution, desktop/mobile Chinese/English light/dark QA, and all repository checks. Production claims require school-domain and service verification, not this design file.
