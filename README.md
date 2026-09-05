# UniKorn frontend

Nuxt 3 / Vue 3 / TypeScript interface for the UniKorn campus community, course planning, academic map, forum, feedback, recruitment challenge and connected TeamUp service.

- **Coding agents:** [AGENTS.md](AGENTS.md); **Claude:** [CLAUDE.md](CLAUDE.md).
- **Documentation:** [task index](docs/README.md), [architecture](docs/architecture.md), [source map](docs/source-map.md).
- **Develop:** [setup](docs/development.md), [testing](docs/testing.md), [UI conventions](docs/features/ui.md).
- **Operate:** [production boundaries](docs/production-environment.md), [dev/legacy frontend release mechanics](deploy/README.md).
- **Changes:** [changelog](CHANGELOG.md), [documentation archive](docs/history.md).

Start with the development guide to choose the API environment. CI uses Node 22 and npm; exact versions are in the workflow. School production has a separately pinned runtime. The UI supports Chinese/English and the `keguang-blue`/`deep-dark` themes.

The Flask backend is the separate `HKUSTGZ-Campus-Forum/back-end` repository. MeetCampus and the embedded TeamUp runtime have separate ownership; this checkout contains integration surfaces, not their complete implementations.
