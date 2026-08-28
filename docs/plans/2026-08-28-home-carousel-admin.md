# Home Carousel Administration Plan

- [x] Add the carousel model, Alembic migration, initial records, and model
      registration.
- [x] Add public locale-filtered carousel and stable image delivery endpoints.
- [x] Add admin CRUD, reorder, archive/restore, upload authorization, validation,
      and audit logging.
- [x] Add backend tests for permissions, validation, lifecycle, locale filtering,
      migration data, and public image safety.
- [x] Add frontend carousel types, public/admin API composables, and deterministic
      fallback mapping.
- [x] Build the bilingual responsive `/admin/carousel` editor and add it to the
      admin shell.
- [x] Replace hard-coded homepage slides with API data plus locale-correct
      bundled fallback.
- [x] Add frontend tests, i18n copy, CHANGELOG and architecture notes.
- [x] Run backend and frontend automated checks.
- [ ] Inspect localhost:3000 in Chinese/English, desktop/mobile, and light/dark
      modes; fix visible defects and stop local servers.
- [ ] Commit and push both repositories to `main`, verify shared dev, then wait
      for explicit production database-plan approval.
- [ ] Publish paired production SHAs, verify public health/auth/write routes and
      CoursePlan isolation, then grant and verify the requested administrator.
